import * as React from "react";
import "../../styles/import-dsr.scss";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";

function ImportOperations() {
  const [years, setYears] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [filteredRows, setFilteredRows] = React.useState([]); // Holds filtered data based on ICD Code
  const [selectedICD, setSelectedICD] = React.useState(""); // Holds the selected ICD code
  const { user } = React.useContext(UserContext);
  const navigate = useNavigate();

  // Fetch available years for filtering
  React.useEffect(() => {
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

  // Fetch rows for the user based on the selected year
  React.useEffect(() => {
    async function getRows() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/${user.username}`
        );

        // Filter the rows based on custom_house and out_of_charge conditions
        const filteredRows = res.data.filter((row) => {
          const { custom_house, out_of_charge } = row;

          // Check if custom_house is 'ICD SANAND' or 'ICD SACHANA'
          if (custom_house === "ICD SANAND" || custom_house === "ICD SACHANA") {
            // If out_of_charge is NOT empty or undefined, exclude the job
            return !(out_of_charge !== "" && out_of_charge !== undefined);
          }

          // If the custom_house doesn't match, keep the job in the result
          return true;
        });

        // Group jobs in the desired order
        const sortedRows = sortRowsByConditions(filteredRows);

        // Set the filtered and sorted rows
        setRows(sortedRows);
      } catch (error) {
        console.error("Error fetching rows:", error);
      }
    }
    getRows();
  }, [selectedYear, user]);
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

  // Filter rows based on the selected ICD Code
  React.useEffect(() => {
    if (selectedICD) {
      const filtered = rows.filter((row) => row.custom_house === selectedICD);
      setFilteredRows(filtered); // Set filtered rows
    } else {
      setFilteredRows(rows); // If no ICD Code selected, show all rows
    }
  }, [selectedICD, rows]);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No & ICD Code",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>
          {cell.getValue()}
          <br />
          <small>{cell.row.original.custom_house}</small> {/* ICD Code */}
        </div>
      ),
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
      header: "BE Number & Date",
      enableSorting: false,
      size: 180,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>
          {cell.getValue()}
          <br />
          <small>{cell.row.original.be_date}</small> {/* BE Date */}
        </div>
      ),
    },
    {
      accessorKey: "container_number",
      header: "Container Numbers",
      enableSorting: false,
      size: 180,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>
          {cell.row.original.container_nos?.map((container, id) => (
            <React.Fragment key={id}>
              {container.container_number}
              <br />
            </React.Fragment>
          ))}
        </div>
      ),
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
    data: filteredRows, // Pass filtered rows to the table
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: {
      density: "compact", // Set initial table density to compact
      showColumnFilters: true, // Ensure that the search/filter is shown by default
      showGlobalFilter: true,
    },
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: true, // Enable column filters (search functionality)
    enableColumnActions: false,
    enableGlobalFilter: true,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    enablePagination: false,
    enableBottomToolbar: false,
    muiTableContainerProps: {
      sx: { maxHeight: "580px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      onClick: () =>
        navigate(
          `/import-operations/view-job/${row.original.job_no}/${row.original.year}`
        ), // Navigate on row click
      style: { cursor: "pointer" }, // Apply inline styles dynamically
    }),
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

export default React.memo(ImportOperations);

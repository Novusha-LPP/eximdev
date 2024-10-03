import * as React from "react";
import "../../styles/import-dsr.scss";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { UserContext } from "../../contexts/UserContext";

function OperationsList() {
  const [years, setYears] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const { user } = React.useContext(UserContext);

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

  React.useEffect(() => {
    async function getRows() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-operations-planning-list/${user.username}`
        );

        // Filter jobs
        const filteredJobs = res.data
          .filter((job) => {
            // 1. Job should have a `be_no`
            // if (!job.be_no) return false;

            // // 2. `be_no` should not be "cancelled" (case-insensitive)
            // if (job.be_no.toLowerCase() === "cancelled") return false;

            // // 3. Exclude jobs where any container has an `arrival_date`
            // const anyContainerArrivalDate = job.container_nos?.some(
            //   (container) => container.arrival_date
            // );
            // if (anyContainerArrivalDate) return false;

            // // // 4. Exclude jobs that have `out_of_charge` truthy
            // // if (job.out_of_charge) return false;

            return true; // Keep the job if none of the above conditions apply
          })
          .sort((a, b) => new Date(a.be_date) - new Date(b.be_date)); // Sort by BE Date in ascending order

        setRows(filteredJobs); // Set the filtered and sorted jobs
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    }

    getRows();
  }, [selectedYear, user]);
  console.log(rows.length);
  console.log(rows);
  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "be_no",
      header: "BE Number",
      enableSorting: false,
      size: 140,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "be_date",
      header: "BE Date",
      enableSorting: false,
      size: 120,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "importer",
      header: "Importer Name", // Add importer column
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "custom_house",
      header: "ICD Code",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
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
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: { density: "compact" }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
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
  });

  return (
    <>
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
        {years?.map((year) => {
          return (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          );
        })}
      </TextField>

      <MaterialReactTable table={table} />
    </>
  );
}

export default React.memo(OperationsList);

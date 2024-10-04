import * as React from "react";
import "../../styles/import-dsr.scss";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { UserContext } from "../../contexts/UserContext";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function ImportOperations() {
  const [years, setYears] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const { user } = React.useContext(UserContext);
  const navigate = useNavigate();

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
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/${user.username}`
      );
      setRows(res.data);
    }
    getRows();
  }, [selectedYear, user]);

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
      header: "Out Of Charge",
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
    // renderTopToolbarCustomActions: () => (
    //   <TextField
    //     select
    //     size="small"
    //     margin="normal"
    //     variant="outlined"
    //     label="ICD Code"
    //     value={}
    //     onChange={(e) => (e.target.value)}
    //     sx={{ width: "200px" }}
    //   ></TextField>
    // ),
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

    // Condition for pcv_date
    if (pcv_date !== "" && pcv_date !== undefined) {
      return "custom-clearance-completed";
    }

    // Condition for be_no and anyContainerArrivalDate
    // if (be_no && anyContainerArrivalDate) {
    //   return "bg-yellow";
    // }

    // Condition for examination_planning_date
    // if (
    //   examination_planning_date !== "" &&
    //   examination_planning_date !== undefined
    // ) {
    //   return "bg-orange";
    // }

    // Condition for out_of_charge
    // if (out_of_charge !== "" && out_of_charge !== undefined) {
    //   return "bg-green";
    // }

    // Default return for no conditions met
    return "";
  };

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

export default React.memo(ImportOperations);

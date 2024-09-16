import * as React from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Link } from "react-router-dom";

function ESanchit() {
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-esanchit-jobs`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => (
        <Link
          to={`/esanchit-job/${cell.row.original.job_no}/${cell.row.original.year}`}
        >
          {cell.row.original.job_no}
        </Link>
      ),
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "custom_house",
      header: "Custom House",
      enableSorting: false,
      size: 150,
    },

    {
      accessorKey: "gateway_igm_date",
      header: "Gateway IGM Date",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "discharge_date",
      header: "Discharge Date/ IGM Date",
      enableSorting: false,
      size: 150,
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: { density: "compact", pagination: { pageSize: 20 } }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    muiTableContainerProps: {
      sx: { maxHeight: "750px", overflowY: "auto" },
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
    <div className="table-container">
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ESanchit);

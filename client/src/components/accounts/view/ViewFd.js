import React, { useEffect, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import axios from "axios";

function ViewFd() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios(`${process.env.REACT_APP_API_STRING}/get-fd`);
        setRows(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "comapny_name",
      header: "Company Name",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "end_date",
      header: "End Date",
      enableSorting: false,
      enableHiding: true,
    },
    {
      accessorKey: "period",
      header: "Period",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "roi",
      header: "Rate of Interest",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      enableSorting: false,
      size: 200,
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
  });

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewFd);

import React, { useEffect, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import axios from "axios";

function ViewRent() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios(`${process.env.REACT_APP_API_STRING}/get-rent`);
        setRows(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "address",
      header: "Address",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "tenant_name",
      header: "Tenant Name",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "property_in_name_of",
      header: "Property In Name Of",
      enableSorting: false,
      enableHiding: true,
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
      size: 200,
    },
    {
      accessorKey: "rent_amount",
      header: "Rent Amount",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "increase_percentage",
      header: "Increase Percentage",
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

export default React.memo(ViewRent);

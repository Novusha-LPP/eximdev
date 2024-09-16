import React, { useEffect, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import axios from "axios";

function ViewLic() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios(`${process.env.REACT_APP_API_STRING}/get-lic`);
        setRows(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "_id",
      header: "ID",
      enableSorting: false,
      enableHiding: true,
      muiTableHeadCellProps: { align: "center" },
    },
    {
      accessorKey: "policy_name",
      header: "Policy Name",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
    },
    {
      accessorKey: "policy_no",
      header: "Policy No",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
    },
    {
      accessorKey: "insured_person_name",
      header: "Insured Person Name",
      enableSorting: false,
      enableHiding: true,
      muiTableHeadCellProps: { align: "center" },
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
    },
    {
      accessorKey: "end_date",
      header: "End Date",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
    },
    {
      accessorKey: "insured_amount",
      header: "Insured Amount",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
    },
    {
      accessorKey: "premium_amount",
      header: "Premium Amount",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
    },
    {
      accessorKey: "premium_term",
      header: "Premium Term",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      enableSorting: false,
      size: 200,
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { align: "center" },
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

export default React.memo(ViewLic);

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Link } from "react-router-dom";

function ViewDrafts() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-customer-kyc-drafts`
      );
      setData(res.data);
    }
    getData();
  }, []);

  const columns = [
    {
      accessorKey: "name_of_individual",
      header: "Name of Individual",
      enableSorting: false,
      size: 350,
    },
    {
      accessorKey: "category",
      header: "Category",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "iec_no",
      header: "IEC",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "action",
      header: "View",
      enableSorting: false,
      size: 120,

      Cell: ({ cell }) => (
        <Link to={`/view-customer-kyc-drafts/${cell.row.original._id}`}>
          View
        </Link>
      ),
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: data,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    enablePagination: false,
    enableBottomToolbar: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["username", "employee_name", "job_no"] },
    }, // Set initial table density to compact
    enableColumnPinning: true, // Enable column pinning
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
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
    <div>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewDrafts);

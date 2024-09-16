import React, { useEffect, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import axios from "axios";
import useTableConfig from "../../customHooks/useTableConfig";
import { Link } from "react-router-dom";

function ViewOutwardRegisters() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-outward-registers`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "bill_given_date",
      header: "Bill Given Date",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "party",
      header: "Party",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "division",
      header: "Division",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "kind_attention",
      header: "Kind Attention",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "courier_details",
      header: "Courier Agency",
      enableSorting: false,
      size: 150,

      Cell: ({ cell }) =>
        cell.getValue()?.includes("Shree Maruti") ||
        cell.getValue()?.includes("Shree Anjani")
          ? cell.getValue()
          : null,
    },
    {
      accessorKey: "courier_details_hand",
      header: "Courier by Hand",
      enableSorting: false,
      size: 150,

      Cell: ({ cell }) =>
        !cell.getValue()?.includes("Shree Maruti") &&
        !cell.getValue()?.includes("Shree Anjani")
          ? cell.getValue()
          : null,
    },
    {
      accessorKey: "weight",
      header: "Weight",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "docket_no",
      header: "Docket No",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "action",
      header: "Action",
      enableSorting: false,
      size: 100,

      Cell: ({ cell }) => {
        return (
          <Link
            to={`/outward-register-details/${cell.row.original._id}`}
            style={{
              pointerEvents: cell.row.original.docket_no ? "none" : "auto",
              color: cell.row.original.docket_no ? "grey" : "blue",
            }}
          >
            View
          </Link>
        );
      },
    },
  ];

  const table = useTableConfig(rows, columns);

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewOutwardRegisters);

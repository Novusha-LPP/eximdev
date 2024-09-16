import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { Link } from "react-router-dom";

function BillingSheet() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-do-billing`
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
      Cell: ({ cell }) => {
        return (
          <Link to={`/edit-billing-sheet/${cell.row.original._id}`}>
            {cell.row.original.job_no}
          </Link>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Party",
      enableSorting: false,
      size: 250,
    },

    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "custom_house",
      header: "Custom House",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "obl_telex_bl",
      header: "OBL Telex BL",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "bill_document_sent_to_accounts",
      header: "Bill Doc Sent To Accounts",
      enableSorting: false,
      size: 300,
    },
  ];

  const table = useTableConfig(rows, columns, "edit-billing-sheet");

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(BillingSheet);

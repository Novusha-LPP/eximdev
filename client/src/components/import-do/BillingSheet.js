import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { Link } from "react-router-dom";

function BillingSheet() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function getData() {
      try {
        const apiString = process.env.REACT_APP_API_STRING;
        if (!apiString) {
          throw new Error("API string not found in environment variables");
        }
        const res = await axios(`${apiString}/get-do-billing`);
        setRows(res.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, []);

  const renderLinkCell = (cell, path) => (
    <Link to={`/${path}/${cell.row.original._id}`}>
      {cell.row.original[cell.column.id]}
    </Link>
  );

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => renderLinkCell(cell, "edit-billing-sheet"),
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(BillingSheet);

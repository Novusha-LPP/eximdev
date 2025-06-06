import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";
import { Link } from "react-router-dom";

function Organisations() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-srcc-organisations`
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
      size: 250,
    },
    {
      accessorKey: "category",
      header: "Category",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "approval",
      header: "Approval Status",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "approved_by",
      header: "Approved By",
      enableSorting: false,
      size: 140,
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "view",
      header: "View",
      enableSorting: false,
      size: 120,
      Cell: ({ cell }) => (
        <Link to={`/view-srcc-organisation-data/${cell.row.original._id}`}>
          View
        </Link>
      ),
    },
  ];

  const table = useTableConfig(data, columns);

  return (
    <div>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default Organisations;

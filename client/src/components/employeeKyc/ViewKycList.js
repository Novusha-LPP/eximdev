import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { Link } from "react-router-dom";

function ViewKycList() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-all-kycs`
      );
      setData(res.data);
    }
    getData();
  }, []);

  const columns = [
    {
      accessorKey: "first_name",
      header: "First Name",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "middle_name",
      header: "Middle Name",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "company",
      header: "Company",
      enableSorting: false,
      size: 300,
    },
    {
      accessorKey: "kyc_approval",
      header: "KYC Approval",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "action",
      header: "Action",
      enableSorting: false,
      size: 120,

      Cell: ({ cell }) => (
        <Link to={`/view-kyc/${cell.row.original.username}`}>View</Link>
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

export default React.memo(ViewKycList);

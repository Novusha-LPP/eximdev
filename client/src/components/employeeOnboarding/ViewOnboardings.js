import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";

function ViewOnboardings() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-onboardings`
      );
      setData(res.data);
    }
    getData();
  }, []);

  const columns = [
    {
      accessorKey: "username",
      header: "Username",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "first_name",
      header: "First Name",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "middle_name",
      header: "Middle Name",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "employee_photo",
      header: "Employee Photo",
      enableSorting: false,
      size: 160,

      Cell: ({ cell }) =>
        cell.getValue() ? <a href={`${cell.getValue()}`}>View</a> : "NA",
    },
    {
      accessorKey: "resume",
      header: "Resume",
      enableSorting: false,
      size: 120,

      Cell: ({ cell }) =>
        cell.getValue() ? <a href={`${cell.getValue()}`}>View</a> : "NA",
    },
    {
      accessorKey: "address_proof",
      header: "Address Proof",
      enableSorting: false,
      size: 150,

      Cell: ({ cell }) =>
        cell.getValue() ? <a href={`${cell.getValue()}`}>View</a> : "NA",
    },
    {
      accessorKey: "nda",
      header: "NDA",
      enableSorting: false,
      size: 160,

      Cell: ({ cell }) =>
        cell.getValue() ? <a href={`${cell.getValue()}`}>View</a> : "NA",
    },
  ];

  const table = useTableConfig(data, columns);

  return (
    <div>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewOnboardings);

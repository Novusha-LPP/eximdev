import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function Vendors() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-vendors`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "vendor_name",
      header: "Vendor Name",
      enableSorting: false,
      size: 300,
    },
    {
      accessorKey: "vendor_address",
      header: "Vendor Address",
      enableSorting: false,
      size: 800,
    },
    {
      accessorKey: "vendor_phone",
      header: "Vendor Phone",
      enableSorting: false,
      size: 300,
    },
  ];

  const table = useTableConfig(rows, columns);

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(Vendors);

import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function Locations() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-location-master`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "location",
      header: "Location",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "district",
      header: "District",
      enableSorting: false,
      size: 200,
    },
  ];

  const table = useTableConfig(rows, columns);

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(Locations);

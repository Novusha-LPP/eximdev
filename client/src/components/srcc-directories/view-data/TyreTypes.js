import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function TyreTypes() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-tyre-types`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "tyre_type",
      header: "Tyre Type",
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

export default React.memo(TyreTypes);

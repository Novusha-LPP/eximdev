import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function RepairTypes() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-repair-types`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "repair_type",
      header: "Repair Type",
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

export default React.memo(RepairTypes);

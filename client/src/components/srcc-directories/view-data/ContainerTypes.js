import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function ContainerTypes() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-container-types`
      );
      setRows(res.data.map((container) => ({ container_type: container })));
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "container_type",
      header: "Container Type",
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

export default React.memo(ContainerTypes);

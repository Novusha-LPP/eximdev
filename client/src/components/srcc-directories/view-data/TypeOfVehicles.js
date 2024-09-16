import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function TypeOfVehicles() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-type-of-vehicles`
      );
      setRows(res.data.map((vehicle) => ({ type_of_vehicle: vehicle })));
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "type_of_vehicle",
      header: "Type of Vehicle",
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

export default React.memo(TypeOfVehicles);

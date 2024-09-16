import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function Vehicles() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-vehicles`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "truck_no",
      header: "Truck No",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "max_tyres",
      header: "Max Tyres",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "type_of_vehicle",
      header: "Type Of Vehicle",
      enableSorting: false,
      size: 300,
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const drivers = row.original.drivers;
        const lastDriver =
          drivers && drivers.length > 0 ? drivers[drivers.length - 1] : {};
        const driverName = lastDriver.driver_name || "N/A";

        return <div>{driverName}</div>;
      },
    },
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const drivers = row.original.drivers;
        const lastDriver =
          drivers && drivers.length > 0 ? drivers[drivers.length - 1] : {};
        const driverPhone = lastDriver.driver_phone || "N/A";

        return <div>{driverPhone}</div>;
      },
    },
  ];

  const table = useTableConfig(rows, columns);

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(Vehicles);

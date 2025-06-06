import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../../customHooks/useTableConfig";

function DriverDetails() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-driver-details`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const columns = [
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "driver_address",
      header: "Driver Address",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "driver_license",
      header: "Driver License",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "license_validity",
      header: "License Validity",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "joining_date",
      header: "Joining Date",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "blood_group",
      header: "Blood Group",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "driver_photo",
      header: "Driver Photo",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) =>
        row.original.driver_photo ? (
          <a href={row.original.driver_photo}>View</a>
        ) : (
          "N/A"
        ),
    },
    {
      accessorKey: "license_photo",
      header: "License Photo",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const licensePhotos = row.original.license_photo;
        return Array.isArray(licensePhotos) && licensePhotos.length > 0
          ? licensePhotos.map((photo, id) => (
              <a key={id} href={photo}>
                View
              </a>
            ))
          : "N/A";
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

export default React.memo(DriverDetails);

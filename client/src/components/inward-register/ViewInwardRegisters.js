import React, { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { UserContext } from "../../contexts/UserContext";

function ViewInwardRegisters() {
  const [rows, setRows] = useState([]);
  const { user } = useContext(UserContext);

  const getData = useCallback(async () => {
    const res = await axios.post(
      `${process.env.REACT_APP_API_STRING}/get-inward-registers`,
      {
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
      }
    );
    setRows(res.data);
  }, [user]);

  const handleStatus = useCallback(
    async (param, _id) => {
      await axios.post(`${process.env.REACT_APP_API_STRING}/handle-status`, {
        param,
        _id,
      });
      getData(); // Fetch updated data after the status change
    },
    [getData]
  );

  useEffect(() => {
    getData();
  }, [getData]);

  const columns = [
    {
      accessorKey: "time",
      header: "Time",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "from",
      header: "From",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: false,
      size: 100,

      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "details_of_document",
      header: "Details Of Document",
      enableSorting: false,
      size: 200,

      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "contact_person_name",
      header: "Contact Person Name",
      enableSorting: false,
      size: 200,

      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "courier_handed_over",
      header: "Courier Handed Over",
      enableSorting: false,
      size: 200,

      Cell: ({ cell, row }) => (
        <div style={{ textAlign: "center" }}>
          {row.original.courier_handed_over === "Done" ? (
            "Done"
          ) : (
            // eslint-disable-next-line
            <a
              href="#"
              onClick={() =>
                handleStatus("courier_handed_over", row.original._id)
              }
            >
              Submit
            </a>
          )}
        </div>
      ),
    },
    {
      accessorKey: "courier_received",
      header: "Courier Received",
      enableSorting: false,
      size: 200,

      Cell: ({ cell, row }) => (
        <div style={{ textAlign: "center" }}>
          {row.original.courier_received === "Done" ? (
            "Done"
          ) : (
            // eslint-disable-next-line
            <a
              href="#"
              onClick={() => handleStatus("courier_received", row.original._id)}
            >
              Submit
            </a>
          )}
        </div>
      ),
    },
  ];

  const table = useTableConfig(rows, columns);

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(ViewInwardRegisters);

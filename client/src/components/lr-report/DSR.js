import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { TextField, MenuItem, IconButton, Checkbox } from "@mui/material"; // Added Checkbox import
import { srccDsrStatus } from "../../assets/data/dsrDetailedStatus";
import SaveIcon from "@mui/icons-material/Save";

function DSR() {
  // State to store table rows
  const [rows, setRows] = useState([]);

  // Fetch data from the API and process it
  const getData = useCallback(async () => {
    const res = await axios.get(
      `${process.env.REACT_APP_API_STRING}/view-srcc-dsr`
    );

    // Filter out completed jobs and ensure `lr_completed` is always defined
    const filteredRows = res.data
      .filter((row) => !row.lr_completed)
      .map((row) => ({
        ...row,
        lr_completed: row.lr_completed ?? false, // Default to false if undefined
      }));

    // Sort rows in descending order based on the numeric part of `tr_no`
    const sortedRows = filteredRows.sort((a, b) => {
      const aNumber = parseInt(a.tr_no.split("/")[2], 10);
      const bNumber = parseInt(b.tr_no.split("/")[2], 10);
      return bNumber - aNumber;
    });

    setRows(sortedRows);
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    getData();
  }, [getData]);

  // Handle input changes for editable fields
  const handleInputChange = (event, rowIndex, columnId) => {
    const { value } = event.target;

    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[rowIndex][columnId] = value;
      return newRows;
    });
  };

  // Save updated rows to the server
  const handleSave = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-srcc-dsr`,
        rows
      );
      alert("Data saved successfully");
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "tr_no",
      header: "LR No",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "container_number",
      header: "Container No",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "sr_cel_no",
      header: "E-Lock No",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "consignor",
      header: "Consignor",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "consignee",
      header: "Consignee",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "goods_delivery",
      header: "Goods Delivery",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "branch",
      header: "Branch",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "vehicle_no",
      header: "Vehicle No",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "shipping_line",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "container_offloading",
      header: "Container Offloading",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "do_validity",
      header: "DO Validity",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "lr_completed",
      header: "LR Completed",
      enableSorting: false,
      size: 150,
      Cell: ({ cell, row }) => (
        <Checkbox
          checked={!!cell.getValue()} // Ensure `checked` is always a boolean
          onChange={(event) =>
            handleInputChange(
              { target: { value: event.target.checked } },
              row.index,
              cell.column.id
            )
          }
        />
      ),
    },
    {
      accessorKey: "action",
      header: "Save",
      enableSorting: false,
      size: 80,
      Cell: ({ cell, row }) => (
        <IconButton onClick={() => handleSave(row.original)}>
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  // Configure the table using the custom hook
  const table = useTableConfig(rows, columns);

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

// Export the component wrapped in React.memo for performance optimization
export default React.memo(DSR);

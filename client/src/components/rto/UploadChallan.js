import React, { useEffect, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { TextField, MenuItem, Snackbar, Alert } from "@mui/material";
import axios from "axios";

const statusOptions = ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED"];

const ElockAssgin = () => {
  const [data, setData] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // 'success' | 'error'
  });

  // Fetch data on mount
  useEffect(() => {
    fetchElockData();
  }, []);

  const fetchElockData = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/elock-assign`
      );
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching Elock Assign data:", err);
    }
  };

  const handleStatusChange = async (newStatus, row) => {
    try {
      const payload = {
        pr_no: row.original.pr_no,
        container_number: row.original.container_number,
        elock_assign_status: newStatus,
      };

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/elock-assign/update-status`,
        payload
      );

      setSnackbar({
        open: true,
        message: "Status updated successfully!",
        severity: "success",
      });

      fetchElockData();
    } catch (error) {
      console.error("Failed to update status:", error);
      setSnackbar({
        open: true,
        message: "Failed to update status.",
        severity: "error",
      });
    }
  };

  const columns = [
    { accessorKey: "tr_no", header: "LR No" },
    {
      accessorKey: "elock_assign_status",
      header: "Elock Status",
      Cell: ({ cell, row }) => (
        <TextField
          select
          value={cell.getValue()}
          onChange={(e) => handleStatusChange(e.target.value, row)}
          variant="outlined"
          size="small"
        >
          {statusOptions.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    { accessorKey: "pr_no", header: "PR No" },
    { accessorKey: "branch", header: "Branch" },
    { accessorKey: "container_number", header: "Container No" },
    { accessorKey: "driver_name", header: "Driver Name" },
    { accessorKey: "driver_phone", header: "Driver Phone" },
    { accessorKey: "vehicle_no", header: "Vehicle No" },
    { accessorKey: "sr_cel_no", header: "E-lock No" },
  ];

  return (
    <>
      <MaterialReactTable
        columns={columns}
        data={data}
        enableColumnPinning
        initialState={{
          columnPinning: {
            left: ["tr_no", "elock_assign_status"],
          },
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ElockAssgin;

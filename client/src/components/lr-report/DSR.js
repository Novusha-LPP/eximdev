import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";

import {
  TextField,
  MenuItem,
  IconButton,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormControlLabel,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

function DSR() {
  // State to store table rows
  const [rows, setRows] = useState([]);
  const [trackingStatusOptions, setTrackingStatusOptions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState({
    tr_no: "",
    offloading_date_time: "",
    detention_days: 0,
    reason_of_detention: "",
    tipping: false,
    document_attachment: null,
    tracking_status: "", // Added tracking_status to dialog data
  });
  const [saving, setSaving] = useState(false);
  const [editedRows, setEditedRows] = useState({}); // Track edited rows

  // Fetch data API call
  const getData = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-srcc-dsr`
      );
      setRows(res.data.data);
      // Reset edited rows when refreshing data
      setEditedRows({});
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, []);

  // Fetch tracking status options
  const fetchTrackingStatus = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/lr-tracking-stages/all`
      );

      if (Array.isArray(response.data)) {
        const options = response.data.map((stage) => stage.name);
        setTrackingStatusOptions(options);
      } else {
        console.error("Invalid data structure received:", response.data);
        setTrackingStatusOptions([]);
      }
    } catch (error) {
      console.error("Error fetching tracking stages:", error);
      setTrackingStatusOptions([]);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    getData();
    fetchTrackingStatus();
  }, [getData, fetchTrackingStatus]);

  // Handle input changes for editable fields with optimized approach
  const handleInputChange = useCallback((value, rowIndex, columnId) => {
    // Track edited rows for optimized rendering
    setEditedRows((prev) => ({
      ...prev,
      [rowIndex]: {
        ...(prev[rowIndex] || {}),
        [columnId]: value,
      },
    }));

    // Update the actual rows data
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        [columnId]: value,
      };
      return newRows;
    });
  }, []);

  // Handle dialog input changes
  const handleDialogInputChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setDialogData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  // Save row data to API
  const saveRowData = useCallback(
    async (row, dialog = null) => {
      if (!row.tr_no) {
        alert("TR number is required");
        return false;
      }

      setSaving(true);

      let dataToSend;

      if (dialog) {
        // If dialog data is present, send all dialog-related fields
        dataToSend = {
          tr_no: row.tr_no,
          lr_completed: row.lr_completed,
          tracking_status: dialog.tracking_status || row.tracking_status, // Use dialog tracking status if available
          offloading_date_time: dialog.offloading_date_time,
          detention_days: dialog.detention_days,
          reason_of_detention: dialog.reason_of_detention,
          tipping: dialog.tipping,
          document_attachment: dialog.document_attachment,
        };
      } else {
        // For normal save (without dialog), send basic fields
        dataToSend = {
          tr_no: row.tr_no,
          lr_completed: row.lr_completed,
          tracking_status: row.tracking_status,
        };
      }

      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/update-srcc-dsr`,
          dataToSend
        );

        if (res.data?.data) {
          alert("Data saved successfully");
          await getData(); // Refresh data after save
          return true;
        }
      } catch (err) {
        console.error("Save error:", err);
        alert(err.response?.data?.message || "Failed to save data");
      } finally {
        setSaving(false);
      }
      return false;
    },
    [getData]
  );

  // Save with dialog handler
  const handleSaveWithDialog = useCallback(async () => {
    const success = await saveRowData(dialogData, dialogData);
    if (success) {
      setDialogOpen(false);
    }
  }, [dialogData, saveRowData]);

  // Regular save handler
  const handleSave = useCallback(
    async (row) => {
      await saveRowData(row);
    },
    [saveRowData]
  );

  // Click handler for save button
  const handleSaveClick = useCallback(
    (row) => {
      if (row.lr_completed) {
        setDialogData({
          ...row,
          document_attachment: null,
        });
        setDialogOpen(true);
      } else {
        handleSave(row);
      }
    },
    [handleSave]
  );

  // Define table columns with memoization for better performance
  const columns = useMemo(
    () => [
      {
        accessorKey: "action",
        header: "Save",
        enableSorting: false,
        size: 80,
        Cell: ({ row }) => (
          <IconButton
            onClick={() => handleSaveClick(row.original)}
            disabled={saving}
          >
            <SaveIcon sx={{ color: "#015C4B" }} />
          </IconButton>
        ),
      },
      {
        accessorKey: "tr_no",
        header: "LR No",
        enableSorting: false,
        size: 170,
      },
      {
        accessorKey: "tracking_status",
        header: "Tracking Status",
        enableSorting: false,
        size: 200,
        Cell: ({ cell, row }) => {
          // Get the current value either from edited state or original data
          const rowIndex = row.index;
          const currentValue =
            editedRows[rowIndex]?.tracking_status !== undefined
              ? editedRows[rowIndex].tracking_status
              : cell.getValue() || "";

          return (
            <TextField
              select
              sx={{ width: "100%" }}
              size="small"
              value={currentValue}
              onChange={(event) =>
                handleInputChange(
                  event.target.value,
                  rowIndex,
                  "tracking_status"
                )
              }
            >
              {trackingStatusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          );
        },
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
        Cell: ({ cell, row }) => {
          // Get the current value either from edited state or original data
          const rowIndex = row.index;
          const currentValue =
            editedRows[rowIndex]?.lr_completed !== undefined
              ? editedRows[rowIndex].lr_completed
              : !!cell.getValue();

          return (
            <Checkbox
              checked={currentValue}
              onChange={(event) =>
                handleInputChange(
                  event.target.checked,
                  rowIndex,
                  "lr_completed"
                )
              }
            />
          );
        },
      },
    ],
    [
      editedRows,
      trackingStatusOptions,
      handleInputChange,
      handleSaveClick,
      saving,
    ]
  );

  // Configure the table using the hook
  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    enablePagination: false,
    enableBottomToolbar: false,
    initialState: {
      density: "compact",
      columnPinning: {
        left: ["action", "tr_no", "tracking_status"], // Pin action, TR No, and Tracking Status to the left in that order
      },
    },
    enableColumnPinning: true,
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
  });

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Additional Details</DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Container Offloading: {dialogData.container_offloading || "N/A"}
          </Typography>

          {/* Add tracking status to dialog */}
          <TextField
            select
            label="Tracking Status"
            name="tracking_status"
            value={dialogData.tracking_status || ""}
            onChange={handleDialogInputChange}
            fullWidth
            margin="normal"
          >
            {trackingStatusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Offloading Date and Time"
            type="datetime-local"
            name="offloading_date_time"
            value={dialogData.offloading_date_time || ""}
            onChange={handleDialogInputChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Detention Days"
            type="number"
            name="detention_days"
            value={dialogData.detention_days || 0}
            onChange={handleDialogInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Reason of Detention"
            name="reason_of_detention"
            value={dialogData.reason_of_detention || ""}
            onChange={handleDialogInputChange}
            fullWidth
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!dialogData.tipping}
                onChange={handleDialogInputChange}
                name="tipping"
              />
            }
            label="Tipping"
            sx={{ mt: 2, mb: 1 }}
          />
          <Button variant="outlined" component="label" fullWidth sx={{ mt: 2 }}>
            Upload Document
            <input
              type="file"
              hidden
              name="document_attachment"
              onChange={(e) =>
                setDialogData((prev) => ({
                  ...prev,
                  document_attachment: e.target.files[0],
                }))
              }
            />
          </Button>
          {dialogData.document_attachment && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: {dialogData.document_attachment.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={handleSaveWithDialog}
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// Export the component
export default React.memo(DSR);

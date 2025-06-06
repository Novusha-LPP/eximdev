import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";

import {
  TextField,
  MenuItem,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormControlLabel,
  Typography,
} from "@mui/material";
import useDsrColumns from "../../customHooks/useDsrColumns";
import useFetchSrccDsr from "../../customHooks/useFetchSrccDsr";

function DSR() {
  // Use custom hooks
  const { rows, setRows, getData } = useFetchSrccDsr();

  // Existing state
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

  // Fetch tracking status options
  const fetchTrackingStatus = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/lr-tracking-status`
      );

      if (Array.isArray(response.data)) {
        setTrackingStatusOptions(response.data);
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
  const handleInputChange = useCallback(
    (value, rowIndex, columnId) => {
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
    },
    [setRows]
  );

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
          tracking_status:
            dialog.tracking_status ||
            (typeof row.tracking_status === "object" && row.tracking_status?._id
              ? row.tracking_status._id
              : row.tracking_status),
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
          tracking_status:
            typeof row.tracking_status === "object" && row.tracking_status?._id
              ? row.tracking_status._id
              : row.tracking_status,
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
          tracking_status:
            typeof row.tracking_status === "object" && row.tracking_status?._id
              ? row.tracking_status._id
              : row.tracking_status || "",
          document_attachment: null,
        });
        setDialogOpen(true);
      } else {
        handleSave(row);
      }
    },
    [handleSave]
  );
  // Define table columns using custom hook
  const columns = useDsrColumns(
    editedRows,
    trackingStatusOptions,
    handleInputChange,
    handleSaveClick,
    saving
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
          {" "}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Container Offloading:{" "}
            {typeof dialogData.container_offloading === "object" &&
            dialogData.container_offloading?.name
              ? dialogData.container_offloading.name
              : dialogData.container_offloading || "N/A"}
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
            {" "}
            {trackingStatusOptions.map((option) => (
              <MenuItem key={option._id} value={option._id}>
                {option.name}
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

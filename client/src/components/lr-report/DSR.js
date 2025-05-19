import React, { useEffect, useState, useCallback } from "react";
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
import { srccDsrStatus } from "../../assets/data/dsrDetailedStatus";
import SaveIcon from "@mui/icons-material/Save";

function DSR() {
  // State to store table rows
  const [rows, setRows] = useState([]);

  // State for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState({
    offloading_date_time: "",
    detention_days: 0,
    reason_of_detention: "",
    tipping: false,
    document_attachment: null,
  });
  const [trackingStatusOptions, setTrackingStatusOptions] = useState([]);
  console.log(dialogData);

  const [saving, setSaving] = useState(false);

  const getData = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-srcc-dsr`
      );
      setRows(res.data.data); // Extract only the actual data array
      // Optional: if you're managing pagination
      // setTotal(res.data.total);
      // setCurrentPage(res.data.currentPage);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, []);
  // Replace the existing useEffect for fetchTrackingStatus with this updated version:

  useEffect(() => {
    const fetchTrackingStatus = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/lr-tracking-stages/all`
        );
        console.log("API Response:", response.data); // Debug log

        // Check if response.data is an array directly
        if (Array.isArray(response.data)) {
          const options = response.data.map((stage) => stage.name);
          console.log("Mapped Options:", options); // Debug log
          setTrackingStatusOptions(options);
        } else {
          console.error("Invalid data structure received:", response.data);
          setTrackingStatusOptions([]); // Set empty array as fallback
        }
      } catch (error) {
        console.error("Error fetching tracking stages:", error);
        setTrackingStatusOptions([]); // Set empty array on error
      }
    };

    fetchTrackingStatus();
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

  const handleDialogInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDialogData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

const saveRowData = async (row, dialog = null) => {
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
      tracking_status: row.tracking_status,
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
      await getData(); // Fetch fresh data after successful save
      return true;
    }
  } catch (err) {
    console.error("Save error:", err);
    alert(err.response?.data?.message || "Failed to save data");
  } finally {
    setSaving(false);
  }
  return false;
};

// Also update the handlers to remove the manual row filtering since getData will refresh the entire list
const handleSaveWithDialog = async () => {
  const success = await saveRowData(dialogData, dialogData);
  if (success) {
    setDialogOpen(false); // Close the modal after successful save
  }
};

const handleSave = async (row) => {
  await saveRowData(row);
};

  const handleSaveClick = (row) => {
    if (row.lr_completed) {
      setDialogData((prev) => ({
        ...prev,
        tr_no: row.tr_no,
        container_offloading: row.container_offloading,
        consignee: row.consignee,
        consignor: row.consignor,
        do_validity: row.do_validity,
        container_offloading: row.container_offloading,
        shipping_line: row.shipping_line,
        goods_delivery: row.goods_delivery,
        vehicle_no: row.vehicle_no,
        lr_completed: row.lr_completed,
        offloading_date_time: row.offloading_date_time,
        detention_days: row.detention_days,
        reason_of_detention: row.reason_of_detention,
        tipping: row.tipping,
        document_attachment: null,
      }));
      setDialogOpen(true);
    } else {
      handleSave(row);
    }
  };

  // Define table columns
  const columns = [
    {
      accessorKey: "tr_no",
      header: "LR No",
      enableSorting: false,
      size: 170,
    },
    // Find and replace the tracking_status column definition with this:
    {
      accessorKey: "tracking_status",
      header: "Tracking Status",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          select
          sx={{ width: "100%" }}
          size="small"
          value={cell.getValue() || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          // Remove or modify the disabled condition
          // disabled={!rows[row.index]?.isValidContainer}
        >
          {trackingStatusOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      ),
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
        <IconButton onClick={() => handleSaveClick(row.original)}>
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  // Configure the table using the custom hook
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
      columnPinning: { left: ["tr_no"] },
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
    // muiTableBodyRowProps: {
    //   style: { cursor: "default" }, // Changed cursor to default since row is not clickable
    // },
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
          <TextField
            label="Offloading Date and Time"
            type="datetime-local"
            name="offloading_date_time"
            value={dialogData.offloading_date_time}
            onChange={handleDialogInputChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Detention Days"
            type="number"
            name="detention_days"
            value={dialogData.detention_days}
            onChange={handleDialogInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Reason of Detention"
            name="reason_of_detention"
            value={dialogData.reason_of_detention}
            onChange={handleDialogInputChange}
            fullWidth
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={dialogData.tipping}
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
            onClick={() => handleSaveWithDialog(dialogData)}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// Export the component wrapped in React.memo for performance optimization
export default React.memo(DSR);

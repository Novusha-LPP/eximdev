import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
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
      return false; // Indicate failure
    }

    setSaving(true); // Set saving to true before starting the save process
    const formData = new FormData();
    formData.append("tr_no", row.tr_no);
    formData.append("lr_completed", true);

    if (dialog) {
      formData.append("offloading_date_time", dialog.offloading_date_time);
      formData.append("detention_days", dialog.detention_days);
      formData.append("reason_of_detention", dialog.reason_of_detention);
      formData.append("tipping", dialog.tipping);
      if (dialog.document_attachment) {
        formData.append("document_attachment", dialog.document_attachment);
      }
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-srcc-dsr`,
        dialogData
      );
      if (res.data?.data) {
        alert("Data saved successfully");
        return true; // Indicate success
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false); // Reset saving to false after the save process
    }
    return false; // Indicate failure
  };

  const handleSaveWithDialog = async () => {
    const success = await saveRowData(dialogData, dialogData);
    if (success) {
      setDialogOpen(false); // Close the modal after successful save
      setRows(
        (prevRows) => prevRows.filter((row) => row.tr_no !== dialogData.tr_no) // Remove the row if condition is satisfied
      );
    }
  };

  const handleSave = async (row) => {
    const success = await saveRowData(row);
    if (success) {
      setRows(
        (prevRows) => prevRows.filter((r) => r.tr_no !== row.tr_no) // Remove the row if condition is satisfied
      );
    }
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
        <IconButton onClick={() => handleSaveClick(row.original)}>
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

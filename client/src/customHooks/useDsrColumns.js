import { useMemo } from "react";
import { IconButton, TextField, MenuItem, Checkbox } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

const useDsrColumns = (
  editedRows,
  trackingStatusOptions,
  handleInputChange,
  handleSaveClick,
  saving
) => {
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
              : typeof cell.getValue() === "object" && cell.getValue()?._id
              ? cell.getValue()._id
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
                <MenuItem key={option._id} value={option._id}>
                  {option.name}
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
        accessorKey: "consignor",
        header: "Consignor",
        size: 150,
        enableColumnFilter: true,
        Cell: ({ row }) => row.original.consignor?.name || "-",
      },
      {
        accessorKey: "consignee",
        header: "Consignee",
        size: 150,
        enableColumnFilter: true,
        Cell: ({ row }) => row.original.consignee?.name || "-",
      },
      {
        accessorKey: "container_details.goods_pickup",
        header: "Container Goods Pickup",
        size: 150,
        enableColumnFilter: true,
        Cell: ({ row }) =>
          row.original.container_details?.goods_pickup?.name || "-",
      },
      {
        accessorKey: "container_details.goods_delivery",
        header: "Container Goods Delivery",
        size: 150,
        enableColumnFilter: true,
        Cell: ({ row }) =>
          row.original.container_details?.goods_delivery?.name || "-",
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
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return typeof value === "object" && value?.name
            ? value.name
            : value || "";
        },
      },
      {
        accessorKey: "container_offloading",
        header: "Container Offloading",
        enableSorting: false,
        size: 200,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          return typeof value === "object" && value?.name
            ? value.name
            : value || "";
        },
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

  return columns;
};

export default useDsrColumns;

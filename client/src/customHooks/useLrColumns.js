import React, { useEffect, useState } from "react";
import {
  TextField,
  IconButton,
  MenuItem,
  Card,
  Button,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Checkbox from "@mui/material/Checkbox";
import axios from "axios";
import SaveIcon from "@mui/icons-material/Save";
import Autocomplete from "@mui/material/Autocomplete";
import { handleSaveLr } from "../utils/handleSaveLr";
import { lrContainerPlanningStatus } from "../assets/data/dsrDetailedStatus";
import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/system";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LocationDialog from "../components/srcel/LocationDialog";

const GlassCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: theme.shape.borderRadius,
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 8px 12px rgba(0, 0, 0, 0.2)",
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backdropFilter: "blur(5px)",
  borderRadius: theme.shape.borderRadius,
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.05)",
    background: "linear-gradient(45deg, #111B21 30%, #2A7D7B 90%)",
  },
}));

function useLrColumns(props) {
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [truckNos, setTruckNos] = useState([]);
  const [elockOptions, setElockOptions] = useState([]);
  // Add this near the top of the useLrColumns function with other state declarations

  // Validate container number format: 4 uppercase letters followed by 7 digits
  const isValidContainerNumber = (value) => {
    const regex = /^[A-Z]{4}\d{7}$/;
    return regex.test(value);
  };

  useEffect(() => {
    async function getVehicleTypes() {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/vehicle-types`
        );
        setTruckNos(response.data.data || []);
      } catch (error) {
        console.error("Error fetching vehicle types:", error);
      }
    }

    getVehicleTypes();
  }, []);

  async function getData() {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/get-trs`,
        { pr_no: props.pr_no }
      );

      // Set the new data with container validation flag
      setRows(
        res.data.map((row) => ({
          ...row,
          availableVehicles: [],
          availableDrivers: [],
          vehicleIds: {},
          isValidContainer: isValidContainerNumber(row.container_number || ""),
        }))
      );
    } catch (error) {
      console.error("Error fetching TR data:", error);
      setRows([]);
    }
  }

  useEffect(() => {
    getData();
  }, [props.prData, props.pr_no]);

  const handleInputChange = (event, rowIndex, columnId) => {
    const { value } = event.target;

    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[rowIndex][columnId] = value;

      // Check container number validity whenever it changes
      if (columnId === "container_number") {
        newRows[rowIndex].isValidContainer = isValidContainerNumber(value);
      }

      // Handle different column changes
      if (columnId === "own_hired") {
        // Reset related fields when changing between Own/Hired
        newRows[rowIndex].type_of_vehicle = "";
        newRows[rowIndex].vehicle_no = "";
        newRows[rowIndex].driver_name = "";
        newRows[rowIndex].driver_phone = "";
        newRows[rowIndex].availableVehicles = [];
        newRows[rowIndex].availableDrivers = [];
      }
      // If the type of vehicle is selected, handle differently based on Own/Hired
      else if (columnId === "type_of_vehicle") {
        if (newRows[rowIndex].own_hired === "Own") {
          // For Own vehicles, fetch vehicle numbers from API
          fetchVehiclesByType(value, newRows, rowIndex);
        }
      }
      // If vehicle number is selected (for Own vehicles)
      else if (
        columnId === "vehicle_no" &&
        newRows[rowIndex].own_hired === "Own"
      ) {
        // Find the driver info from the availableDrivers array we stored when fetching vehicles
        if (
          newRows[rowIndex].availableDrivers &&
          newRows[rowIndex].availableDrivers.length > 0
        ) {
          const selectedDriver = newRows[rowIndex].availableDrivers.find(
            (driver) => driver.vehicleNumber === value
          );

          if (selectedDriver) {
            newRows[rowIndex].driver_name = selectedDriver.driverName || "";
            newRows[rowIndex].driver_phone = selectedDriver.driverPhone || "";
          } else {
            newRows[rowIndex].driver_name = "";
            newRows[rowIndex].driver_phone = "";
          }
        }
      }

      return newRows;
    });
  };

  const handleDelete = async (tr_no, container_number) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this TR?"
    );

    if (confirmDelete) {
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/delete-tr`,
          {
            pr_no: props.pr_no,
            tr_no,
            container_number,
          }
        );

        // Immediately refresh data after deletion
        await getData();

        // Success message
        alert(res.data.message);

        // Call the parent's refresh function after successful deletion
        if (props.onDelete) {
          props.onDelete();
        }
      } catch (error) {
        console.error("Error deleting TR:", error);
        alert("Failed to delete TR");
      }
    }
  };

  const handleCheckboxChange = (row) => {
    setSelectedRows((prevSelectedRows) => {
      if (prevSelectedRows.includes(row)) {
        return prevSelectedRows.filter((selectedRow) => selectedRow !== row);
      } else {
        return [...prevSelectedRows, row];
      }
    });
  };

  // Function to fetch vehicles by type
  const fetchVehiclesByType = async (type_of_vehicle, newRows, rowIndex) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/vehicles?type_of_vehicle=${type_of_vehicle}`
      );

      if (response.data && response.data.drivers) {
        // Filter out vehicles that are occupied
        const availableDrivers = response.data.drivers.filter(
          (driver) => !driver.isOccupied
        );

        // Store the complete filtered drivers array
        newRows[rowIndex].availableDrivers = availableDrivers;

        // Store vehicle numbers for the dropdown
        newRows[rowIndex].availableVehicles = availableDrivers.map(
          (driver) => driver.vehicleNumber
        );

        // Store the vehicle IDs for updating occupancy
        newRows[rowIndex].vehicleIds = {};
        response.data.drivers.forEach((driver) => {
          newRows[rowIndex].vehicleIds[driver.vehicleNumber] = {
            id: driver.vehicleNumber_id,
            isOccupied: driver.isOccupied || false,
          };
        });

        // Reset vehicle number and driver details when type changes
        newRows[rowIndex].vehicle_no = "";
        newRows[rowIndex].driver_name = "";
        newRows[rowIndex].driver_phone = "";

        setRows([...newRows]); // Important to create a new array to trigger re-render
      }
    } catch (error) {
      console.error("Error fetching vehicles by type:", error);
      alert("Failed to fetch vehicles of this type");
      newRows[rowIndex].availableVehicles = [];
      newRows[rowIndex].availableDrivers = [];
    }
  };

  const columns = [
    {
      accessorKey: "print",
      enableSorting: false,
      enableGrouping: false,
      size: 50,
      Cell: ({ row }) => {
        const hasTrNo = !!row.original.tr_no;
        const isValidContainer = row.original.isValidContainer;

        return (
          <Checkbox
            style={{ padding: 0 }}
            disabled={!(hasTrNo && isValidContainer)} // Only enabled if both are true
            onChange={() => handleCheckboxChange(row.original)}
          />
        );
      },
    },
    {
      accessorKey: "delete",
      enableSorting: false,
      enableGrouping: false,
      size: 50,
      Cell: ({ row }) => (
        <IconButton
          onClick={async () => {
            await handleDelete(
              row.original.tr_no,
              row.original.container_number
            );
            await getData();
          }}
        >
          <DeleteIcon
            sx={{ color: "#BE3838", cursor: "pointer", fontSize: "18px" }}
          />
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
      accessorKey: "container_number",
      header: "Container Number",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) =>
        !row.original.tr_no ? (
          <TextField
            sx={{ width: "100%" }}
            size="small"
            value={rows[row.index]?.container_number || ""}
            onChange={(e) => {
              const newValue = e.target.value.toUpperCase(); // Convert to uppercase
              setRows((prevRows) => {
                const updatedRows = [...prevRows];
                updatedRows[row.index] = {
                  ...updatedRows[row.index],
                  container_number: newValue,
                  isValidContainer: isValidContainerNumber(newValue),
                };
                return updatedRows;
              });
            }}
            onBlur={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
            error={
              !!rows[row.index]?.container_number &&
              !rows[row.index]?.isValidContainer
            }
            helperText={
              !!rows[row.index]?.container_number &&
              !rows[row.index]?.isValidContainer
                ? "Format: ABCD1234567 (4 uppercase letters + 7 digits)"
                : ""
            }
            inputProps={{
              maxLength: 11,
            }}
            placeholder="ABCD1234567"
          />
        ) : (
          cell.getValue()
        ),
    },
    {
      accessorKey: "seal_no",
      header: "Seal No",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.seal_no || ""}
          onChange={(e) => {
            const inputValue = e.target.value.toUpperCase(); // Convert to uppercase
            const isValidInput =
              /^[A-Z0-9!@#$%^&*()_\-+=<>?/.,:;'"\\[\]{}|`~]*$/.test(inputValue); // Allow uppercase, numbers, and special chars

            if (isValidInput && inputValue.length <= 30) {
              setRows((prevRows) => {
                const updatedRows = [...prevRows];
                updatedRows[row.index].seal_no = inputValue;
                return updatedRows;
              });
            }
          }}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          error={rows[row.index]?.seal_no?.length > 30}
          helperText={
            rows[row.index]?.seal_no?.length > 30
              ? "Seal No must be up to 30 characters"
              : ""
          }
          disabled={!rows[row.index]?.isValidContainer}
        />
      ),
    },
    {
      accessorKey: "gross_weight",
      header: "Gross Weight",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.gross_weight || ""}
          inputProps={{
            maxLength: 8,
            inputMode: "decimal",
          }}
          onChange={(e) => {
            const inputValue = e.target.value;
            const validFormat = /^(\d+(\.\d*)?)?$/; // Allows empty, or valid positive decimal numbers

            if (validFormat.test(inputValue)) {
              // Allow empty string or non-negative numbers
              if (inputValue === "" || parseFloat(inputValue) >= 0) {
                setRows((prevRows) => {
                  const updatedRows = [...prevRows];
                  updatedRows[row.index].gross_weight = inputValue;
                  return updatedRows;
                });
              }
            }
          }}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={!rows[row.index]?.isValidContainer}
        />
      ),
    },
    {
      accessorKey: "tare_weight",
      header: "Tare Weight",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.tare_weight || ""}
          inputProps={{
            maxLength: 8,
            inputMode: "decimal",
          }}
          onChange={(e) => {
            const inputValue = e.target.value;
            const validFormat = /^(\d+(\.\d*)?)?$/; // Allows only positive decimals and empty

            if (validFormat.test(inputValue)) {
              if (inputValue === "" || parseFloat(inputValue) >= 0) {
                setRows((prevRows) => {
                  const updatedRows = [...prevRows];
                  updatedRows[row.index].tare_weight = inputValue;
                  return updatedRows;
                });
              }
            }
          }}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={!rows[row.index]?.isValidContainer}
        />
      ),
    },
    {
      accessorKey: "net_weight",
      header: "Net Weight",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.net_weight || ""}
          inputProps={{
            maxLength: 8,
            inputMode: "decimal",
          }}
          onChange={(e) => {
            const inputValue = e.target.value;
            const validFormat = /^(\d+(\.\d*)?)?$/; // Only positive decimal or empty

            if (validFormat.test(inputValue)) {
              if (inputValue === "" || parseFloat(inputValue) >= 0) {
                setRows((prevRows) => {
                  const updatedRows = [...prevRows];
                  updatedRows[row.index].net_weight = inputValue;
                  return updatedRows;
                });
              }
            }
          }}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={!rows[row.index]?.isValidContainer}
        />
      ),
    },
    {
      accessorKey: "goods_pickup",
      header: "Goods Pickup",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={props.locations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.goods_pickup || null}
          onChange={(event, newValue) =>
            handleInputChange(
              { target: { value: newValue } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => <TextField {...params} size="small" />}
          disabled={!rows[row.index]?.isValidContainer}
        />
      ),
    },
    {
      accessorKey: "goods_delivery",
      header: "Goods Delivery",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={props.locations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.goods_delivery || null}
          onChange={(event, newValue) =>
            handleInputChange(
              { target: { value: newValue } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => <TextField {...params} size="small" />}
          disabled={!rows[row.index]?.isValidContainer}
        />
      ),
    },
    {
      accessorKey: "own_hired",
      header: "Own/ Hired",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          select
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.own_hired || ""}
          onChange={(e) => {
            setRows((prevRows) => {
              const updatedRows = [...prevRows];
              updatedRows[row.index].own_hired = e.target.value;
              return updatedRows;
            });
            handleInputChange(e, row.index, cell.column.id);
          }}
          disabled={!rows[row.index]?.isValidContainer}
        >
          <MenuItem value="Own">Own</MenuItem>
          <MenuItem value="Hired">Hired</MenuItem>
        </TextField>
      ),
    },
    {
      accessorKey: "type_of_vehicle",
      header: "Type of Vehicle",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <Autocomplete
          options={truckNos.map((vehicle) => vehicle.vehicleType)} // Extract vehicle types
          getOptionLabel={(option) => option || ""}
          value={cell.getValue() || null}
          onChange={(event, newValue) =>
            handleInputChange(
              { target: { value: newValue } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Select vehicle type"
              error={
                !rows[row.index]?.isValidContainer ||
                !rows[row.index]?.own_hired
              }
              // helperText={
              //   !rows[row.index]?.isValidContainer ||
              //   !rows[row.index]?.own_hired
              //     ? "Select Own/Hired and ensure container is valid"
              //     : ""
              // }
            />
          )}
          disabled={
            !rows[row.index]?.isValidContainer || !rows[row.index]?.own_hired
          }
          fullWidth
        />
      ),
    },
    {
      accessorKey: "vehicle_no",
      header: "Vehicle No",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        // Different input field based on Own/Hired
        if (row.original.own_hired === "Own") {
          // Current saved value
          const savedValue = cell.getValue() || "";

          // Check if we have available vehicles loaded
          const hasAvailableVehicles =
            rows[row.index]?.availableVehicles?.length > 0;

          // If we have a saved value but no available vehicles yet, we need to show the saved value anyway
          const menuItems = hasAvailableVehicles
            ? rows[row.index].availableVehicles.map((vehicleNo) => (
                <MenuItem key={vehicleNo} value={vehicleNo}>
                  {vehicleNo}
                </MenuItem>
              ))
            : savedValue
            ? [
                <MenuItem key={savedValue} value={savedValue}>
                  {savedValue}
                </MenuItem>,
              ]
            : [<MenuItem disabled>Select vehicle type first</MenuItem>];

          return (
            <TextField
              select
              sx={{ width: "100%" }}
              size="small"
              value={savedValue}
              onChange={(event) =>
                handleInputChange(event, row.index, cell.column.id)
              }
              disabled={!row.original.type_of_vehicle} // Disable until vehicle type is selected
            >
              {menuItems}
            </TextField>
          );
        } else {
          // For Hired vehicles, show text input field
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              value={cell.getValue() || ""}
              onChange={(event) =>
                handleInputChange(event, row.index, cell.column.id)
              }
              placeholder="Enter vehicle number"
            />
          );
        }
      },
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        if (row.original.own_hired === "Own") {
          // For Own vehicles, show auto-filled value
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              value={cell.getValue() || ""}
              disabled={true} // Read-only for Own vehicles
            />
          );
        } else {
          // For Hired vehicles, show editable text field
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              value={cell.getValue() || ""}
              onChange={(event) => {
                const inputValue = event.target.value;
                // Allow only alphabetic characters
                if (/^[a-zA-Z\s]*$/.test(inputValue)) {
                  handleInputChange(event, row.index, cell.column.id);
                }
              }}
              placeholder="Enter driver name"
              disabled={!rows[row.index]?.isValidContainer}
            />
          );
        }
      },
    },
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const savedValue = cell.getValue() || "";
        const isValidPhoneNumber = /^[0-9]{10}$/.test(savedValue); // Validate 10-digit phone number

        if (row.original.own_hired === "Own") {
          // For Own vehicles, show auto-filled value
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              value={savedValue}
              disabled={true} // Read-only for Own vehicles
            />
          );
        } else {
          // For Hired vehicles, show editable text field with validation
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              value={savedValue}
              onChange={(event) =>
                handleInputChange(event, row.index, cell.column.id)
              }
              placeholder="Enter driver phone"
              inputProps={{
                maxLength: 10,
                inputMode: "numeric", // mobile-friendly numeric keyboard
                pattern: "[0-9]*", // regex pattern for numeric input
              }}
              error={!isValidPhoneNumber && savedValue}
              helperText={
                !isValidPhoneNumber && savedValue
                  ? "Enter a valid 10-digit phone number"
                  : ""
              }
              disabled={!rows[row.index]?.isValidContainer}
            />
          );
        }
      },
    },

    {
      accessorKey: "eWay_bill",
      header: "E-Way Bill (only 12-digit)",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.eWay_bill || ""}
          placeholder="Enter E-Way Bill number"
          inputProps={{
            maxLength: 12,
            inputMode: "numeric", // mobile-friendly numeric keyboard
            pattern: "[0-9]*", // regex pattern for numeric input
          }}
          onChange={(e) => {
            const value = e.target.value;
            // Allow only digits and max 12 characters
            if (/^\d{0,12}$/.test(value)) {
              setRows((prevRows) => {
                const updatedRows = [...prevRows];
                updatedRows[row.index].eWay_bill = value;
                return updatedRows;
              });
            }
          }}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={!rows[row.index]?.isValidContainer}
        />
      ),
    },

    {
      accessorKey: "action",
      header: "Save",
      enableSorting: false,
      size: 100,
      Cell: ({ cell, row }) => {
        return (
          <IconButton
            onClick={async () => {
              await handleSaveLr(row.original, props);
              await getData(); // Refresh rows after saving
            }}
            disabled={!rows[row.index]?.isValidContainer}
          >
            <SaveIcon
              sx={{
                color: rows[row.index]?.isValidContainer
                  ? "#015C4B"
                  : "#9E9E9E",
              }}
            />
          </IconButton>
        );
      },
    },
  ];

  return {
    rows,
    setRows,
    columns,
    selectedRows,
  };
}

export default useLrColumns;

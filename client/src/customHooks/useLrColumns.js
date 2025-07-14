import React, { useEffect, useState, useCallback } from "react";
import { TextField, IconButton, MenuItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Checkbox from "@mui/material/Checkbox";
import axios from "axios";
import SaveIcon from "@mui/icons-material/Save";
import Autocomplete from "@mui/material/Autocomplete";
import { handleSaveLr } from "../utils/handleSaveLr";

function useLrColumns(props) {
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [truckNos, setTruckNos] = useState([]);
  // Add this near the top of the useLrColumns function with other state declarations

  // ISO 6346 Container Number Validation with Check Digit
  const isValidContainerNumber = (value) => {
    if (!value) return false;

    const containerNumber = value.toUpperCase();
    const containerNumberRegex = /^[A-Z]{3}[UJZ][A-Z0-9]{6}\d$/;

    if (!containerNumberRegex.test(containerNumber)) {
      return false;
    }

    // Validate check digit
    const checkDigit = calculateCheckDigit(containerNumber.slice(0, 10));
    const lastDigit = parseInt(containerNumber[10], 10);

    return checkDigit === lastDigit;
  };

  // Helper function for check digit calculation
  const calculateCheckDigit = (containerNumber) => {
    if (containerNumber.length !== 10) return null;

    const weightingFactors = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
    let total = 0;

    for (let i = 0; i < containerNumber.length; i++) {
      total += equivalentValue(containerNumber[i]) * weightingFactors[i];
    }

    const subTotal = Math.floor(total / 11);
    return total - subTotal * 11;
  };

  // Helper function for character equivalences
  const equivalentValue = (char) => {
    const equivalences = {
      A: 10,
      B: 12,
      C: 13,
      D: 14,
      E: 15,
      F: 16,
      G: 17,
      H: 18,
      I: 19,
      J: 20,
      K: 21,
      L: 23,
      M: 24,
      N: 25,
      O: 26,
      P: 27,
      Q: 28,
      R: 29,
      S: 30,
      T: 31,
      U: 32,
      V: 34,
      W: 35,
      X: 36,
      Y: 37,
      Z: 38,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      0: 0,
    };
    return equivalences[char] || 0;
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

  const getData = useCallback(async () => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/get-trs`,
        { pr_no: props.pr_no }
      );


      // Set the new data with container validation flag
      setRows(
        res.data.map((row) => {
          return {
            ...row,
            availableVehicles: [],
            availableDrivers: [],
            vehicleIds: {},
            isValidContainer: isValidContainerNumber(
              row.container_number || ""
            ),
          };
        })
      );
    } catch (error) {
      console.error("Error fetching TR data:", error);
      setRows([]);
    }
  }, [props.pr_no]);

  useEffect(() => {
    getData();
  }, [getData]);

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
          // Extract vehicleType from the selected value (could be ObjectId or vehicleType string)
          let vehicleTypeString = value;
          if (typeof value === "string" && value.length === 24) {
            // If it's an ObjectId, find the vehicleType from truckNos
            const vehicleObj = truckNos.find((truck) => truck._id === value);
            vehicleTypeString = vehicleObj?.vehicleType || value;
          }
          fetchVehiclesByType(vehicleTypeString, newRows, rowIndex);
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
            disabled={!hasTrNo} // Only enabled if both are true
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
                ? "Format: ABCD1234567 (4 uppercase letters + 7 digits) or Not a Real Container Number"
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
        />
      ),
    },
    {
      accessorKey: "goods_pickup",
      header: "Goods Pickup",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.goods_pickup || "";
        const selectedOption = props.locations?.find((location) => {
          // Handle both ObjectId strings and populated objects
          if (typeof currentValue === "object" && currentValue?.name) {
            return location.location_name === currentValue.name;
          }
          if (typeof currentValue === "object" && currentValue?._id) {
            return location._id === currentValue._id;
          }
          return (
            location._id === currentValue ||
            location.location_name === currentValue
          );
        });

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={props.locations || []}
            getOptionLabel={(option) => option.location_name || option}
            value={selectedOption || null}
            onChange={(event, newValue) =>
              handleInputChange(
                { target: { value: newValue?._id || newValue || "" } },
                row.index,
                cell.column.id
              )
            }
            renderInput={(params) => <TextField {...params} size="small" />}
          />
        );
      },
    },
    {
      accessorKey: "goods_delivery",
      header: "Goods Delivery",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.goods_delivery || "";
        const selectedOption = props.locations?.find((location) => {
          // Handle both ObjectId strings and populated objects
          if (typeof currentValue === "object" && currentValue?.name) {
            return location.location_name === currentValue.name;
          }
          if (typeof currentValue === "object" && currentValue?._id) {
            return location._id === currentValue._id;
          }
          return (
            location._id === currentValue ||
            location.location_name === currentValue
          );
        });

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={props.locations || []}
            getOptionLabel={(option) => option.location_name || option}
            value={selectedOption || null}
            onChange={(event, newValue) =>
              handleInputChange(
                { target: { value: newValue?._id || newValue || "" } },
                row.index,
                cell.column.id
              )
            }
            renderInput={(params) => <TextField {...params} size="small" />}
          />
        );
      },
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
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.type_of_vehicle || "";
        const selectedOption = truckNos.find((vehicle) => {
          // Handle both ObjectId strings and populated objects
          if (typeof currentValue === "object" && currentValue?.vehicleType) {
            return vehicle.vehicleType === currentValue.vehicleType;
          }
          if (typeof currentValue === "object" && currentValue?._id) {
            return vehicle._id === currentValue._id;
          }
          return (
            vehicle._id === currentValue || vehicle.vehicleType === currentValue
          );
        });

        return (
          <Autocomplete
            options={truckNos}
            getOptionLabel={(option) => option.vehicleType || ""}
            value={selectedOption || null}
            onChange={(event, newValue) =>
              handleInputChange(
                {
                  target: {
                    value: newValue?._id || newValue?.vehicleType || "",
                  },
                },
                row.index,
                cell.column.id
              )
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select vehicle type"
                error={!rows[row.index]?.own_hired}
              />
            )}
            disabled={!rows[row.index]?.own_hired}
            fullWidth
          />
        );
      },
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
          const vehicleNoRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;
          const value = cell.getValue() || "";
          const isValidVehicleNo = vehicleNoRegex.test(value);
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              value={value}
              onChange={(event) =>
                handleInputChange(event, row.index, cell.column.id)
              }
              placeholder="Enter vehicle number"
              inputProps={{
                maxLength: 10, // optional limit
                style: { textTransform: "uppercase" }, // make typing UPPERCASE
              }}
              error={!!value && !isValidVehicleNo}
              helperText={
                !!value && !isValidVehicleNo
                  ? "Invalid format. Use: AA00AA0000 or similar"
                  : ""
              }
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
        const indianMobileRegex = /^[6-9]\d{9}$/;

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
              error={!!savedValue && !indianMobileRegex.test(savedValue)}
              helperText={
                !!savedValue && !indianMobileRegex.test(savedValue)
                  ? "Driver phone must be 10 digits starting with 6-9"
                  : ""
              }
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
      Cell: ({ cell, row }) => {
        const eWaybillRegex = /^\d{12}$/;
        const eWayBillValue = rows[row.index]?.eWay_bill || "";
        const isValidEWayBill = eWaybillRegex.test(eWayBillValue);

        return (
          <TextField
            sx={{ width: "100%" }}
            size="small"
            value={eWayBillValue}
            placeholder="Enter E-Way Bill number"
            inputProps={{
              maxLength: 12,
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
            error={!!eWayBillValue && !isValidEWayBill}
            helperText={
              !!eWayBillValue && !isValidEWayBill
                ? "E-Way Bill must be exactly 12 digits"
                : ""
            }
            onChange={(e) => {
              const value = e.target.value;
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
          />
        );
      },
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
          >
            <SaveIcon
              sx={{
                color: "#015C4B",
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

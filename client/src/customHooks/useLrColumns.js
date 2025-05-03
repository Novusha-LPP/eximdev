import React, { useEffect, useState } from "react";
import { TextField, IconButton, MenuItem, Card, Button } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Checkbox from "@mui/material/Checkbox";
import axios from "axios";
import SaveIcon from "@mui/icons-material/Save";
import Autocomplete from "@mui/material/Autocomplete";
import { handleSaveLr } from "../utils/handleSaveLr";
import { lrContainerPlanningStatus } from "../assets/data/dsrDetailedStatus";
import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/system";
// import SrCelDropdown from "./SrCelDropdown.js";
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
  const [filteredTruckNos, setFilteredTruckNos] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [truckNos, setTruckNos] = useState([]);
  const [srcelOptions, setSrcelOptions] = useState([]);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [isUpdatingOccupancy, setIsUpdatingOccupancy] = useState(false);
  console.log(`locationData`, locationData);
  // console.log(truckNos);
  // console.log(`srCelNos`, srCelNos);
  useEffect(() => {
    // Fetch the sr_cel options when the component mounts
    fetchSrcelOptions();
  }, []);
  const fetchSrcelOptions = async () => {
    try {
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_STRING || "http://localhost:9000/api"
        }/elock/get-elocks`
      );
      const data = response.data.data.map((elock) => ({
        label: elock.ElockCode, // Use ElockCode as the label
        value: elock._id, // Use _id as the value
        ...elock, // Include all other elock properties
      }));
      setSrcelOptions(data);
    } catch (error) {
      console.error("Error fetching Elocks:", error);
    }
  };
  const SrCelDropdown = ({ options, onSelect, defaultValue, rowIndex }) => {
    return (
      <Autocomplete
        options={options}
        getOptionLabel={(option) => option.label || "N/A"}
        renderInput={(params) => <TextField {...params} size="small" />}
        onChange={(event, newValue) => {
          onSelect(
            {
              target: {
                value: newValue ? newValue.label : "N/A",
              },
            },
            rowIndex,
            "sr_cel_no"
          );
          onSelect(
            {
              target: {
                value: newValue ? newValue.FGUID : "N/A",
              },
            },
            rowIndex,
            "sr_cel_FGUID"
          );
          onSelect(
            {
              target: {
                value: newValue ? newValue.value : "N/A",
              },
            },
            rowIndex,
            "sr_cel_id"
          );
        }}
        defaultValue={
          options.find((option) => option.label === defaultValue) || null
        }
        size="small"
        fullWidth
      />
    );
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

      // Clear all existing rows first
      setRows([]);

      // Then set the new data
      setRows(
        res.data.map((row) => ({
          ...row,
          availableVehicles: [],
          availableDrivers: [],
          vehicleIds: {},
          // Add any other dynamic properties that need to be reset
        }))
      );
    } catch (error) {
      console.error("Error fetching TR data:", error);
      setRows([]);
    }
  }

  useEffect(() => {
    getData();
    // eslint-disable-next-line
  }, [props.prData, props.pr_no]);
  useEffect(() => {
    async function getData() {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/get-trs`,
        { pr_no: props.pr_no }
      );

      // After setting the rows, we need to initialize vehicle data for each row
      const loadedRows = res.data;
      setRows(loadedRows);

      // For each row that has "Own" vehicle and a type_of_vehicle, load the available vehicles
      loadedRows.forEach((row, index) => {
        if (row.own_hired === "Own" && row.type_of_vehicle) {
          loadVehiclesForRow(row.type_of_vehicle, index);
        }
      });
    }

    getData();
    // eslint-disable-next-line
  }, [props.prData, props.pr_no]);

  // // Add this new function to load vehicles for existing rows
  // const loadVehiclesForRow = async (vehicleType, rowIndex) => {
  //   try {
  //     const response = await axios.get(
  //       `${process.env.REACT_APP_API_STRING}/vehicles?type_of_vehicle=${vehicleType}`
  //     );

  //     if (response.data && response.data.drivers) {
  //       setRows((prevRows) => {
  //         const newRows = [...prevRows];

  //         // Store the complete drivers array
  //         newRows[rowIndex].availableDrivers = response.data.drivers;

  //         // Store vehicle numbers for the dropdown
  //         newRows[rowIndex].availableVehicles = response.data.drivers.map(
  //           (driver) => driver.vehicleNumber
  //         );

  //         return newRows;
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error loading vehicles for row:", error);
  //   }
  // };
  const handleLocationClick = async (asset) => {
    console.log(asset);
    try {
      const response = await axios.post(
        "http://icloud.assetscontrols.com:8092/OpenApi/LBS",
        {
          FTokenID: "e36d2589-9dc3-4302-be7d-dc239af1846c",
          FAction: "QueryLBSMonitorListByFGUIDs",
          FGUIDs: asset,
          FType: 2,
        }
      );
      console.log(response.data);
      if (response.data.Result === 200 && response.data.FObject.length > 0) {
        console.log(response.data.FObject[0]);
        setLocationData(response.data.FObject[0]);
        setOpenLocationDialog(true);
      } else {
        alert("Failed to fetch location data");
      }
    } catch (error) {
      alert("An error occurred while fetching location data");
    }
  };

  const handleInputChange = (event, rowIndex, columnId) => {
    const { value } = event.target;

    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[rowIndex][columnId] = value;

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
        // For Hired, we'll just keep the text field empty
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

        // Immediately refresh data after deletion to ensure complete sync with backend
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

  const filterTruckNos = (vehicleType) => {
    const filtered = truckNos.filter(
      (truck) => truck.type_of_vehicle === vehicleType
    );
    setFilteredTruckNos(filtered);
  };

  // Add this function to handle the occupancy toggle
  const handleOccupancyToggle = async (
    vehicleId,
    currentOccupiedState,
    rowIndex
  ) => {
    try {
      setIsUpdatingOccupancy(true);

      // Make the API call to update the vehicle's occupied status
      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-vehicle-occupied/${vehicleId}`,
        {
          isOccupied: !currentOccupiedState,
        }
      );

      if (response.data && response.status === 200) {
        // Update the local state to reflect the change
        setRows((prevRows) => {
          const newRows = [...prevRows];
          newRows[rowIndex].isOccupied = !currentOccupiedState;
          return newRows;
        });

        // Refresh the available vehicles for all rows to update dropdowns
        refreshAvailableVehicles();

        // Show success message
        alert("Vehicle status updated successfully");
      } else {
        alert("Failed to update vehicle status");
      }
    } catch (error) {
      console.error("Error updating vehicle occupancy:", error);
      alert("Error updating vehicle status");
    } finally {
      setIsUpdatingOccupancy(false);
    }
  };

  // Function to refresh available vehicles data for all rows
  const refreshAvailableVehicles = async () => {
    // For each row with a selected vehicle type, refresh the available vehicles
    rows.forEach((row, index) => {
      if (row.own_hired === "Own" && row.type_of_vehicle) {
        loadVehiclesForRow(row.type_of_vehicle, index);
      }
    });
  };

  // Update the fetchVehiclesByType function to filter out occupied vehicles
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

  // Similarly update the loadVehiclesForRow function to handle occupied vehicles
  const loadVehiclesForRow = async (vehicleType, rowIndex) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/vehicles?type_of_vehicle=${vehicleType}`
      );

      if (response.data && response.data.drivers) {
        setRows((prevRows) => {
          const newRows = [...prevRows];

          // Store all drivers data first (including occupied ones)
          const allDrivers = response.data.drivers;

          // Create a map of vehicle IDs and their occupancy status
          newRows[rowIndex].vehicleIds = {};
          allDrivers.forEach((driver) => {
            newRows[rowIndex].vehicleIds[driver.vehicleNumber] = {
              id: driver.vehicleNumber_id,
              isOccupied: driver.isOccupied || false,
            };
          });

          // Filter out vehicles that are occupied for the dropdown
          const availableDrivers = allDrivers.filter(
            (driver) => !driver.isOccupied
          );

          // Store the complete filtered drivers array
          newRows[rowIndex].availableDrivers = availableDrivers;

          // Store vehicle numbers for the dropdown
          newRows[rowIndex].availableVehicles = availableDrivers.map(
            (driver) => driver.vehicleNumber
          );

          // Special case: if the row already has a vehicle number selected,
          // we need to make sure it appears in the dropdown even if occupied
          const currentVehicle = newRows[rowIndex].vehicle_no;
          if (
            currentVehicle &&
            !newRows[rowIndex].availableVehicles.includes(currentVehicle)
          ) {
            const matchingDriver = allDrivers.find(
              (d) => d.vehicleNumber === currentVehicle
            );
            if (matchingDriver) {
              // Add the currently selected vehicle to available vehicles
              newRows[rowIndex].availableVehicles.push(currentVehicle);
              newRows[rowIndex].availableDrivers.push(matchingDriver);
            }
          }

          return newRows;
        });
      }
    } catch (error) {
      console.error("Error loading vehicles for row:", error);
    }
  };

  // Enhanced populateDriverDetails with better error handling
  const populateDriverDetails = (newRows, rowIndex, vehicleNo) => {
    if (!vehicleNo) {
      newRows[rowIndex].driver_name = "";
      newRows[rowIndex].driver_phone = "";
      return;
    }

    // First check if we have available vehicles data in the row
    if (newRows[rowIndex].availableVehicles?.length > 0) {
      // Find the driver data from API response stored in availableVehicles
      const driverData = truckNos.find(
        (truck) => truck.vehicleNumber === vehicleNo
      );

      if (driverData) {
        newRows[rowIndex].driver_name = driverData.driverName || "";
        newRows[rowIndex].driver_phone = driverData.driverPhone || "";
      } else {
        newRows[rowIndex].driver_name = "";
        newRows[rowIndex].driver_phone = "";
      }
    } else {
      // Fallback to fetching the driver data if availableVehicles is not populated
      fetchDriverDetailsByVehicle(vehicleNo, newRows, rowIndex);
    }
  };
  // New function to fetch driver details by vehicle number if needed
  const fetchDriverDetailsByVehicle = async (vehicleNo, newRows, rowIndex) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/vehicle-details?vehicle_no=${vehicleNo}`
      );

      if (response.data && response.data.driver) {
        newRows[rowIndex].driver_name = response.data.driver.driverName || "";
        newRows[rowIndex].driver_phone = response.data.driver.driverPhone || "";
      } else {
        newRows[rowIndex].driver_name = "";
        newRows[rowIndex].driver_phone = "";
      }

      setRows([...newRows]); // Important to create a new array to trigger re-render
    } catch (error) {
      console.error("Error fetching driver details:", error);
      newRows[rowIndex].driver_name = "";
      newRows[rowIndex].driver_phone = "";
    }
  };

  const handleCloseLocationDialog = () => {
    setOpenLocationDialog(false);
    setLocationData(null);
  };
  const columns = [
    {
      accessorKey: "print",
      enableSorting: false,
      enableGrouping: false,
      size: 50,
      Cell: ({ row }) => {
        const hasTrNo = !!row.original.tr_no;
        const isEwayValid = /^\d{12}$/.test(row.original.eWay_bill);

        return (
          <Checkbox
            style={{ padding: 0 }}
            // disabled={!(hasTrNo && isEwayValid)} // ✅ Only enabled if BOTH are true
            disabled={!hasTrNo} // ✅ Only enabled if BOTH are true
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
      size: 100,
    },
    {
      accessorKey: "container_number",
      header: "Container Number",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.container_number || ""}
          onChange={(e) => {
            const newValue = e.target.value;
            setRows((prevRows) => {
              const updatedRows = [...prevRows];
              updatedRows[row.index].container_number = newValue;
              return updatedRows;
            });
          }}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
        />
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
            setRows((prevRows) => {
              const updatedRows = [...prevRows];
              updatedRows[row.index].seal_no = e.target.value;
              return updatedRows;
            });
          }}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
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
          onChange={(e) => {
            setRows((prevRows) => {
              const updatedRows = [...prevRows];
              updatedRows[row.index].gross_weight = e.target.value;
              return updatedRows;
            });
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
          onChange={(e) => {
            setRows((prevRows) => {
              const updatedRows = [...prevRows];
              updatedRows[row.index].tare_weight = e.target.value;
              return updatedRows;
            });
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
          onChange={(e) => {
            setRows((prevRows) => {
              const updatedRows = [...prevRows];
              updatedRows[row.index].net_weight = e.target.value;
              return updatedRows;
            });
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
        <TextField
          select
          sx={{ width: "100%" }}
          size="small"
          value={cell.getValue() || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
        >
          {Array.isArray(truckNos) && truckNos.length > 0 ? (
            truckNos.map((vehicle) => (
              <MenuItem key={vehicle._id} value={vehicle.vehicleType}>
                {vehicle.vehicleType}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>No vehicle types available</MenuItem>
          )}
        </TextField>
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

    // Updated driver name column
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
              onChange={(event) =>
                handleInputChange(event, row.index, cell.column.id)
              }
              placeholder="Enter driver name"
            />
          );
        }
      },
    },

    // Updated driver phone column
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
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
              onChange={(event) =>
                handleInputChange(event, row.index, cell.column.id)
              }
              placeholder="Enter driver phone"
            />
          );
        }
      },
    },

    {
      accessorKey: "sr_cel_no",
      header: "E-Lock No",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <SrCelDropdown
          options={srcelOptions}
          onSelect={handleInputChange}
          defaultValue={cell.getValue()}
          rowIndex={row.index}
        />
      ),
    },

    // {
    //   accessorKey: "status",
    //   header: "Status",
    //   enableSorting: false,
    //   size: 200,
    //   Cell: ({ cell, row }) => {
    //     const currentValue = cell.getValue();
    //     const options = lrContainerPlanningStatus.includes(currentValue)
    //       ? lrContainerPlanningStatus
    //       : [currentValue, ...lrContainerPlanningStatus];

    //     return (
    //       <TextField
    //         select
    //         fullWidth
    //         label="Status"
    //         size="small"
    //         defaultValue={currentValue}
    //         onBlur={(event) =>
    //           handleInputChange(event, row.index, cell.column.id)
    //         }
    //         disabled={
    //           row.original.status === "Successful Collection of SR-CEL Lock"
    //         }
    //       >
    //         {options.map((item) => (
    //           <MenuItem key={item} value={item}>
    //             {item}
    //           </MenuItem>
    //         ))}
    //       </TextField>
    //     );
    //   },
    // },
    // {
    //   accessorKey: "realtime_location",
    //   header: "Realtime Location",
    //   enableSorting: false,
    //   size: 200,
    //   Cell: ({ row }) => (
    //     <Button
    //       variant="contained"
    //       className="btn"
    //       color="secondary"
    //       onClick={() => handleLocationClick(row.original.sr_cel_FGUID)}
    //       startIcon={<LocationOnIcon fontSize="small" color="inherit" />}
    //       sx={{ minWidth: "60%", textTransform: "none" }}
    //       disabled={
    //         row.original.status === "Successful Collection of SR-CEL Lock"
    //       }
    //     >
    //       Track Location
    //     </Button>
    //   ),
    // },
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
        />
      ),
    },
    // {
    //   accessorKey: "isOccupied",
    //   header: "On Trip",
    //   enableSorting: false,
    //   size: 80,
    //   Cell: ({ row }) => {
    //     // Only show checkbox for Own vehicles with a selected vehicle number
    //     const isOwnVehicle = row.original.own_hired === "Own";
    //     const vehicleNo = row.original.vehicle_no;

    //     if (!isOwnVehicle || !vehicleNo) {
    //       return null;
    //     }

    //     // Get the vehicle ID and occupancy status from the stored map
    //     const vehicleInfo = rows[row.index]?.vehicleIds?.[vehicleNo];
    //     console.log(vehicleInfo?.isOccupied);
    //     const vehicleId = vehicleInfo?.id;
    //     const isOccupied = vehicleInfo?.isOccupied || false;

    //     if (!vehicleId) {
    //       return null;
    //     }

    //     return (
    //       <Checkbox
    //         checked={isOccupied}
    //         onChange={() =>
    //           handleOccupancyToggle(vehicleId, isOccupied, row.index)
    //         }
    //         disabled={isUpdatingOccupancy}
    //       />
    //     );
    //   },
    // },
    {
      accessorKey: "action",
      header: "Save",
      enableSorting: false,
      size: 100,
      Cell: ({ cell, row }) => {
        const statusValue = row.original.status; // Assuming 'status' is the key for status in row.original

        return (
          <IconButton
            onClick={async () => {
              await handleSaveLr(row.original, props);
              await getData(); // Refresh rows after saving
            }}
            disabled={statusValue === "Successful Collection of SR-CEL Lock"}
          >
            {statusValue === "Successful Collection of SR-CEL Lock" ? (
              <Tooltip title="Action not required" arrow>
                <IconButton disabled>
                  <SaveIcon sx={{ color: "#9E9E9E" }} />{" "}
                  {/* Greyed-out color */}
                </IconButton>
              </Tooltip>
            ) : (
              <SaveIcon sx={{ color: "#015C4B" }} />
            )}
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
    openLocationDialog,
    handleCloseLocationDialog,
    locationData,
  };
}

export default useLrColumns;

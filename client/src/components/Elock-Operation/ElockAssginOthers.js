import React, { useEffect, useState, useCallback } from "react";
import { MaterialReactTable } from "material-react-table";
import {
  Button,
  Box,
  TextField,
  Autocomplete,
  MenuItem,
  Typography,
  InputAdornment,
  IconButton,
  Pagination,
} from "@mui/material";
import ElockGPSOperation from "./ElockGPSOperation.js";
import SearchIcon from "@mui/icons-material/Search";
import PlaceIcon from "@mui/icons-material/Place";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const statusOptions = ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED"];

const ElockAssignOthers = () => {
  const [data, setData] = useState([]);
  const [elockOptions, setElockOptions] = useState([]);
  const [organisationOptions, setOrganisationOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [editValues, setEditValues] = useState({
    transporter: "",
    client: "",
  
    tr_no: "",
    container_number: "",
    vehicle_no: "",
    driver_name: "",
    driver_phone: "",
    elock_no: "",
    elock_assign_status: "UNASSIGNED",
    goods_pickup: "",
    goods_delivery: "",
  });
  const [inlineCreateValues, setInlineCreateValues] = useState({
    transporter: "",
    client: "",
   
    tr_no: "",
    container_number: "",
    vehicle_no: "",
    driver_name: "",
    driver_phone: "",
    elock_no: "",
    elock_assign_status: "UNASSIGNED",
    goods_pickup: "",
    goods_delivery: "",
  });
  const [isGPSModalOpen, setIsGPSModalOpen] = useState(false);
  const [selectedElockNo, setSelectedElockNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch main data
  const fetchElockAssignOthersData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/elock/assign-others`,
        {
          params: {
            page,
            limit: 100,
            search: debouncedSearchQuery,
          },
        }
      );
      setData(res.data.jobs || []);
      setTotalJobs(res.data.totalJobs || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching Elock Assign Others data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearchQuery]); // Fetch available elocks
  const fetchAvailableElocks = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/available-elocks`
      );
      // Handle the nested data structure from the API response
      const elocks = res.data?.data || res.data?.elocks || res.data || [];
      setElockOptions(Array.isArray(elocks) ? elocks : []);
      console.log("Fetched elocks:", elocks); // Debug log
    } catch (err) {
      console.error("Error fetching available elocks:", err);
      setElockOptions([]); // Set empty array on error
    }
  }, []); // Fetch organisations
  const fetchOrganisations = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/organisations`
      );
      // Handle the nested data structure from the API response
      const orgs = res.data?.data || res.data?.organisations || res.data || [];
      setOrganisationOptions(Array.isArray(orgs) ? orgs : []);
      console.log("Fetched organisations:", orgs); // Debug log
    } catch (err) {
      console.error("Error fetching organisations:", err);
      setOrganisationOptions([]); // Set empty array on error
    }
  }, []);
  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-location`
      );
      // Handle the nested data structure from the API response
      const locations = res.data?.data || res.data?.locations || res.data || [];
      setLocationOptions(Array.isArray(locations) ? locations : []);
      console.log("Fetched locations:", locations); // Debug log
    } catch (err) {
      console.error("Error fetching locations:", err);
      setLocationOptions([]); // Set empty array on error
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Initial data fetch
  useEffect(() => {
    fetchElockAssignOthersData();
  }, [debouncedSearchQuery, page, fetchElockAssignOthersData]);

  // Fetch dropdown data on mount
  useEffect(() => {
    fetchAvailableElocks();
    fetchOrganisations();
    fetchLocations();
  }, [fetchAvailableElocks, fetchOrganisations, fetchLocations]);

  // Save edited row
  const handleSaveRow = async (row) => {
    try {
      setLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/elock/assign-others/${row.original._id}`,
        editValues
      );
      setEditingRow(null);
      fetchElockAssignOthersData();
      fetchAvailableElocks(); // Refresh dropdown
    } catch (error) {
      console.error("Error updating record:", error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  }; // Inline create functions
  const handleStartInlineCreate = () => {
    setIsInlineCreating(true);
    setInlineCreateValues({
      transporter: "",
      client: "",

      container_number: "",
      vehicle_no: "",
      driver_name: "",
      driver_phone: "",
      elock_no: "",
      elock_assign_status: "UNASSIGNED",
      goods_pickup: "",
      goods_delivery: "",
    });
  };

  const handleSaveInlineCreate = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/elock/assign-others`,
        inlineCreateValues
      );
      setIsInlineCreating(false);
      setInlineCreateValues({
        transporter: "",
        client: "",

        container_number: "",
        vehicle_no: "",
        driver_name: "",
        driver_phone: "",
        elock_no: "",
        elock_assign_status: "UNASSIGNED",
        goods_pickup: "",
        goods_delivery: "",
      });
      fetchElockAssignOthersData();
      fetchAvailableElocks(); // Refresh dropdown
    } catch (error) {
      console.error("Error creating record:", error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInlineCreate = () => {
    setIsInlineCreating(false);
    setInlineCreateValues({
      transporter: "",
      client: "",

      container_number: "",
      vehicle_no: "",
      driver_name: "",
      driver_phone: "",
      elock_no: "",
      elock_assign_status: "UNASSIGNED",
      goods_pickup: "",
      goods_delivery: "",
    });
  };

  // Delete record
  const handleDeleteRow = async (row) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        setLoading(true);
        await axios.delete(
          `${process.env.REACT_APP_API_STRING}/elock/assign-others/${row.original._id}`
        );
        fetchElockAssignOthersData();
        fetchAvailableElocks(); // Refresh dropdown
      } catch (error) {
        console.error("Error deleting record:", error);
        alert(`Error: ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };
  const handleEditRow = (row) => {
    setEditingRow(row.id);
    setEditValues({
      transporter: row.original.transporter?._id || "",
      client: row.original.client?._id || "",
   
      tr_no: row.original.tr_no || "",
      container_number: row.original.container_number || "",
      vehicle_no: row.original.vehicle_no || "",
      driver_name: row.original.driver_name || "",
      driver_phone: row.original.driver_phone || "",
      elock_no: row.original.elock_no?._id || "",
      elock_assign_status: row.original.elock_assign_status || "UNASSIGNED",
      goods_pickup: row.original.goods_pickup?._id || "",
      goods_delivery: row.original.goods_delivery?._id || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };
  const columns = [
    {
      header: "Actions",
      accessorKey: "actions",
      size: 200,
      pinned: "left",
      Cell: ({ row }) => {
        // Check if this is the inline create row
        if (row.original._id === "inline-create") {
          return (
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleSaveInlineCreate}
                disabled={
                  loading ||
                  !inlineCreateValues.transporter ||
                  !inlineCreateValues.client
                }
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleCancelInlineCreate}
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
          );
        }

        return (
          <Box display="flex" gap={1}>
            {editingRow === row.id ? (
              <>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => handleSaveRow(row)}
                  disabled={loading}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => handleEditRow(row)}
                  disabled={loading || isInlineCreating}
                >
                  Edit
                </Button>
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleDeleteRow(row)}
                  disabled={loading || isInlineCreating}
                >
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          </Box>
        );
      },
    },
   
    {
      accessorKey: "tr_no",
      header: "TR No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.tr_no}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  tr_no: e.target.value,
                })
              }
              sx={{ width: 120 }}
              placeholder="Enter TR No"
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.tr_no}
              onChange={(e) =>
                setEditValues({ ...editValues, tr_no: e.target.value })
              }
              sx={{ width: 120 }}
            />
          );
        }
        return row.original.tr_no;
      },
    },
    {
      accessorKey: "transporter",
      header: "Transporter",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === inlineCreateValues.transporter
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  transporter: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Transporter *"
                />
              )}
              sx={{ width: 200 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === editValues.transporter
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  transporter: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 200 }}
            />
          );
        }
        return row.original.transporter?.name || "";
      },
    },
    {
      accessorKey: "client",
      header: "Client",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === inlineCreateValues.client
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  client: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Client *"
                />
              )}
              sx={{ width: 200 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === editValues.client
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  client: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 200 }}
            />
          );
        }
        return row.original.client?.name || "";
      },
    },
    {
      accessorKey: "container_number",
      header: "Container No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.container_number}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  container_number: e.target.value,
                })
              }
              sx={{ width: 150 }}
              placeholder="Container No"
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.container_number}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  container_number: e.target.value,
                })
              }
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.container_number;
      },
    },
    {
      accessorKey: "vehicle_no",
      header: "Vehicle No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.vehicle_no}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  vehicle_no: e.target.value,
                })
              }
              sx={{ width: 150 }}
              placeholder="Vehicle No"
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.vehicle_no}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  vehicle_no: e.target.value,
                })
              }
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.vehicle_no;
      },
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.driver_name}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  driver_name: e.target.value,
                })
              }
              sx={{ width: 150 }}
              placeholder="Driver Name"
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.driver_name}
              onChange={(e) =>
                setEditValues({ ...editValues, driver_name: e.target.value })
              }
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.driver_name;
      },
    },
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.driver_phone}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  driver_phone: e.target.value,
                })
              }
              sx={{ width: 150 }}
              placeholder="Driver Phone"
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.driver_phone}
              onChange={(e) =>
                setEditValues({ ...editValues, driver_phone: e.target.value })
              }
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.driver_phone;
      },
    },
    {
      accessorKey: "elock_no",
      header: "E-lock No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={Array.isArray(elockOptions) ? elockOptions : []}
              getOptionLabel={(option) => option.FAssetID || ""}
              value={
                Array.isArray(elockOptions)
                  ? elockOptions.find(
                      (opt) => opt._id === inlineCreateValues.elock_no
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  elock_no: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select E-lock"
                />
              )}
              sx={{ width: 150 }}
            />
          );
        }

        if (editingRow === row.id) {
          // Merge current elock with available elocks for editing
          let mergedOptions = Array.isArray(elockOptions) ? elockOptions : [];
          if (
            editValues.elock_no &&
            !mergedOptions.some((opt) => opt._id === editValues.elock_no)
          ) {
            const currentElock = {
              _id: editValues.elock_no,
              FAssetID: row.original.elock_no?.FAssetID || editValues.elock_no,
            };
            mergedOptions = [currentElock, ...elockOptions];
          }
          return (
            <Autocomplete
              options={mergedOptions}
              getOptionLabel={(option) => option.FAssetID || ""}
              value={
                mergedOptions.find((opt) => opt._id === editValues.elock_no) ||
                null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  elock_no: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.elock_no?.FAssetID || "";
      },
    },
    {
      accessorKey: "elock_assign_status",
      header: "Elock Status",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              select
              fullWidth
              size="small"
              value={inlineCreateValues.elock_assign_status}
              variant="standard"
              sx={{ width: 150 }}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  elock_assign_status: e.target.value,
                })
              }
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              select
              fullWidth
              size="small"
              value={editValues.elock_assign_status}
              variant="standard"
              sx={{ width: 150 }}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  elock_assign_status: e.target.value,
                })
              }
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        return row.original.elock_assign_status;
      },
    },
    {
      accessorKey: "goods_pickup",
      header: "Pickup Location",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === inlineCreateValues.goods_pickup
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  goods_pickup: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Pickup"
                />
              )}
              sx={{ width: 180 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === editValues.goods_pickup
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  goods_pickup: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 180 }}
            />
          );
        }
        return row.original.goods_pickup?.name || "";
      },
    },
    {
      accessorKey: "goods_delivery",
      header: "Delivery Location",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === inlineCreateValues.goods_delivery
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  goods_delivery: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Delivery"
                />
              )}
              sx={{ width: 180 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === editValues.goods_delivery
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  goods_delivery: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 180 }}
            />
          );
        }
        return row.original.goods_delivery?.name || "";
      },
    },
    {
      accessorKey: "elock_gps",
      header: "Elock GPS",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Box>
              <IconButton disabled={true} size="small" color="primary">
                <PlaceIcon />
              </IconButton>
            </Box>
          );
        }

        const elockNo = row.original.elock_no?.FAssetID;
        return (
          <Box>
            <IconButton
              onClick={() => {
                setSelectedElockNo(elockNo);
                setIsGPSModalOpen(true);
              }}
              disabled={!elockNo || elockNo.trim() === ""}
              size="small"
              color="primary"
            >
              <PlaceIcon />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  // Create table data with inline create row if needed
  const tableData = React.useMemo(() => {
    if (isInlineCreating) {
      const inlineCreateRow = {
        _id: "inline-create",
       
        tr_no: "",
        transporter: null,
        client: null,
        container_number: "",
        driver_name: "",
        driver_phone: "",
        elock_no: null,
        elock_assign_status: "UNASSIGNED",
        goods_pickup: null,
        goods_delivery: null,
      };
      return [inlineCreateRow, ...data];
    }
    return data;
  }, [isInlineCreating, data]);

  return (
    <Box sx={{ p: 2 }}>
      <MaterialReactTable
        columns={columns}
        data={tableData}
        enableColumnResizing
        enableColumnOrdering
        enablePagination={false} // Handled manually via MUI Pagination
        enableBottomToolbar={false}
        enableDensityToggle={false}
        initialState={{
          density: "compact",
          columnPinning: { left: ["actions", "tr_no"] },
        }}
        enableGlobalFilter={false}
        enableGrouping
        enableColumnFilters={false}
        enableColumnActions={false}
        enableStickyHeader
        enablePinning
        muiTableContainerProps={{
          sx: { maxHeight: "650px", overflowY: "auto" },
        }}
        muiTableHeadCellProps={{
          sx: {
            position: "sticky",
            top: 0,
            zIndex: 1,
            textAlign: "left",
          },
        }}
        muiTableBodyCellProps={{
          sx: {
            textAlign: "left",
          },
        }}
        state={{
          isLoading: loading,
        }}
        renderTopToolbarCustomActions={() => (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              p: 1,
            }}
          >
            {" "}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Others Count: {totalJobs}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleStartInlineCreate}
                disabled={loading || isInlineCreating || editingRow !== null}
              >
                Add New Record
              </Button>
            </Box>
            <TextField
              placeholder="Search by any field..."
              size="small"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchInputChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton>
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ width: "400px" }}
            />
          </Box>
        )}
      />

      <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
          disabled={loading}
        />{" "}
      </Box>

      <ElockGPSOperation
        isOpen={isGPSModalOpen}
        onClose={() => setIsGPSModalOpen(false)}
        elockNo={selectedElockNo}
      />
    </Box>
  );
};

export default ElockAssignOthers;

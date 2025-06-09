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
import LockOpenIcon from "@mui/icons-material/LockOpen";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";

const statusOptions = ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED"];

const ElockAssign = () => {
  const [data, setData] = useState([]);
  const [elockOptions, setElockOptions] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({
    elock_assign_status: "",
    elock_no: "",
  });
  const [isGPSModalOpen, setIsGPSModalOpen] = useState(false);
  const [selectedElockNo, setSelectedElockNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  // Constants for external API
  const TOKEN_ID = "e36d2589-9dc3-4302-be7d-dc239af1846c";
  const ADMIN_API_URL = "http://icloud.assetscontrols.com:8092/OpenApi/Admin";
  const INSTRUCTION_API_URL =
    "http://icloud.assetscontrols.com:8092/OpenApi/Instruction";

  const fetchElockData = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/elock-assign`,
        {
          params: {
            page,
            limit: 100,
            search: debouncedSearchQuery,
          },
        }
      );
      setData(res.data.data || []);
      setTotalJobs(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching Elock Assign data:", err);
    }
  }, [page, debouncedSearchQuery]);

  const fetchAvailableElocks = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/available-elocks`
      );
      setElockOptions(res.data || []);
    } catch (err) {
      console.error("Error fetching available elocks:", err);
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);
  useEffect(() => {
    fetchElockData();
    fetchAvailableElocks();
  }, [debouncedSearchQuery, page, fetchElockData, fetchAvailableElocks]);

  // Save row using new assign-elock endpoint
  // Save row using new assign-elock endpoint
  // Save row using new assign-elock endpoint - FIXED VERSION
  const handleSaveRow = async (row) => {
    try {
      console.log("Row data:", row.original); // Debug log

      const payload = {
        prId: row.original.pr_id || row.original._id, // Use pr_id (the actual PR ID)
        containerId: row.original.container_id || row.original._id, // Use container_id (the actual container ID)
        newElockNo: editValues.elock_no,
        elockAssignStatus: editValues.elock_assign_status,
      };

      console.log("Payload being sent:", payload); // Debug log

      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/assign-elock`,
        payload
      );

      console.log("Response:", response.data); // Debug log

      setEditingRow(null);
      fetchElockData();
      fetchAvailableElocks(); // Refresh dropdown
    } catch (error) {
      console.error("Error updating status:", error);
      console.error("Error response:", error.response?.data); // Debug log
      // Show user-friendly error message
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };
  const handleEditRow = (row) => {
    setEditingRow(row.id);
    setEditValues({
      elock_assign_status: row.original.elock_assign_status || "",
      elock_no: row.original.elock_no_id || "", // Use the ObjectId for editing
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

  // Handle unlock operation
  const handleUnlockElock = async (elockNo) => {
    if (!elockNo || elockNo.trim() === "") {
      alert("No E-lock number available for unlock operation");
      return;
    }

    const confirmUnlock = window.confirm(
      `Are you sure you want to unlock E-lock: ${elockNo}?`
    );

    if (!confirmUnlock) return;

    try {
      // First, get the asset data to retrieve the FGUID
      const assetResponse = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryAdminAssetByAssetId",
          FTokenID: TOKEN_ID,
          FAssetID: elockNo,
        }),
      });

      if (!assetResponse.ok) {
        throw new Error(
          `Failed to fetch asset data: ${assetResponse.statusText}`
        );
      }

      const assetResult = await assetResponse.json();
      if (!assetResult.FObject?.length) {
        throw new Error("Asset not found in external system");
      }

      const assetData = assetResult.FObject[0];

      // Now send the unlock command
      const unlockResponse = await fetch(INSTRUCTION_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FTokenID: TOKEN_ID,
          FAction: "OpenLockControl",
          FAssetGUID: assetData.FGUID,
        }),
      });

      if (!unlockResponse.ok) {
        throw new Error(`Unlock request failed: ${unlockResponse.statusText}`);
      }

      const unlockResult = await unlockResponse.json();

      if (unlockResult.Result === 200) {
        alert("Unlock instruction sent successfully!");
      } else {
        alert(
          `Failed to send unlock instruction: ${
            unlockResult.Message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error during unlock operation:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const columns = [
    {
      header: "Actions",
      accessorKey: "actions",
      size: 150,
      pinned: "left",
      Cell: ({ row }) => (
        <Box display="flex" gap={1}>
          {editingRow === row.id ? (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => handleSaveRow(row)}
                startIcon={<SaveIcon />}
              ></Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleCancelEdit}
                startIcon={<CancelIcon />}
              ></Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => handleEditRow(row)}
              startIcon={<EditIcon />}
            ></Button>
          )}
        </Box>
      ),
    },
    {
      accessorKey: "tr_no",
      header: "LR No",
      pinned: "left",
    },
    {
      accessorKey: "elock_no",
      header: "E-lock No",
      Cell: ({ row }) => {
        if (editingRow === row.id) {
          // Ensure the current value is always in the options
          let mergedOptions = elockOptions;
          if (
            editValues.elock_no &&
            !elockOptions.some((opt) => opt._id === editValues.elock_no)
          ) {
            // If current value is not in available options, add it
            const currentElock = {
              _id: editValues.elock_no,
              FAssetID: row.original.elock_no || editValues.elock_no,
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
                <TextField {...params} variant="standard" />
              )}
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.elock_no;
      },
    },
    {
      accessorKey: "elock_assign_status",
      header: "Elock Status",
      Cell: ({ row }) => {
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

    // { accessorKey: "pr_no", header: "PR No" },
    // { accessorKey: "branch", header: "Branch" },
    {
      accessorKey: "elock_gps",
      header: "Elock GPS",
      Cell: ({ row }) => {
        const elockNo = row.original.elock_no;
        return (
          <Box display="flex" gap={1}>
            <IconButton
              onClick={() => {
                setSelectedElockNo(elockNo);
                setIsGPSModalOpen(true);
              }}
              disabled={!elockNo || elockNo.trim() === ""}
              size="small"
              color="primary"
              title="View GPS Location"
            >
              <PlaceIcon />
            </IconButton>
            <IconButton
              onClick={() => handleUnlockElock(elockNo)}
              disabled={!elockNo || elockNo.trim() === ""}
              size="small"
              color="secondary"
              title="Unlock E-lock"
            >
              <LockOpenIcon />
            </IconButton>
          </Box>
        );
      },
    },
    { accessorKey: "container_number", header: "Container No" },
    { accessorKey: "driver_name", header: "Driver Name" },
    { accessorKey: "driver_phone", header: "Driver Phone" },
    { accessorKey: "vehicle_no", header: "Vehicle No" },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <MaterialReactTable
        columns={columns}
        data={data}
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
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", marginRight: "auto" }}
            >
              LR Count: {totalJobs}
            </Typography>
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
        />
      </Box>

      <ElockGPSOperation
        isOpen={isGPSModalOpen}
        onClose={() => setIsGPSModalOpen(false)}
        elockNo={selectedElockNo}
      />
    </Box>
  );
};

export default ElockAssign;

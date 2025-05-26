import React, { useEffect, useState } from "react";
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
import SearchIcon from "@mui/icons-material/Search";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

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
  }, [debouncedSearchQuery, page]);

  const fetchElockData = async () => {
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
  };

  const fetchAvailableElocks = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/elock/get-elocks`
      );
    
      setElockOptions(res.data.data || []);
    } catch (err) {
      console.error("Error fetching available elocks:", err);
    }
  };

  const handleEditRow = (row) => {
    setEditingRow(row.id);
    setEditValues({
      elock_assign_status: row.original.elock_assign_status || "",
      elock_no: row.original.elock_no || "",
    });
  };

  const handleSaveRow = async (row) => {
    try {
      const payload = {
        pr_no: row.original.pr_no,
        container_number: row.original.container_number,
        elock_assign_status: editValues.elock_assign_status,
        elock_no: editValues.elock_no,
       
      };
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/elock-assign/update-status`,
        payload
      );
      

      setEditingRow(null);
      fetchElockData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
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
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => handleEditRow(row)}
            >
              Edit
            </Button>
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
          return (
            <Autocomplete
              options={elockOptions}
              getOptionLabel={(option) => option.FAssetID || ""}
              value={elockOptions.find(opt => opt.FAssetID === editValues.elock_no) || null}
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  elock_no: newValue ? newValue.FAssetID : "",
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

    { accessorKey: "pr_no", header: "PR No" },
    { accessorKey: "branch", header: "Branch" },
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
    </Box>
  );
};

export default ElockAssign;

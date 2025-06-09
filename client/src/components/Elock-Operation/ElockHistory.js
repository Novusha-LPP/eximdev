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

const ElockHistory = () => {
  const [data, setData] = useState([]);
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
  }, [debouncedSearchQuery, page]);

  const fetchElockData = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/elock-assign&other-history`,
        {
          params: {
            page,
            limit: 100,
            search: debouncedSearchQuery,
            sort: "RETURNED", // Add this line
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
  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };
  const columns = [
    {
      accessorKey: "tr_no",
      header: "LR No",
      pinned: "left",
    },
    {
      accessorKey: "container_number",
      header: "Container No.",
    },
    {
      accessorKey: "elock_no",
      header: "elock_no",
    },

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

export default ElockHistory;

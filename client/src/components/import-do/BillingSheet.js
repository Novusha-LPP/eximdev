import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
} from "@mui/material";

function BillingSheet() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [totalJobs, setTotalJobs] = React.useState(0);
  const limit = 100;
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch jobs based on search query and pagination
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiString =
        process.env.REACT_APP_API_STRING || "http://localhost:5000"; // Fallback for dev
      const res = await axios.get(`${apiString}/get-do-billing`, {
        params: {
          search: debouncedSearchQuery,
          page,
          limit,
        },
      });

      const { jobs = [], totalJobs = 0, totalPages = 1 } = res.data;
      setRows(jobs);
      setTotalJobs(totalJobs);
      setTotalPages(totalPages);
    } catch (err) {
      setRows([]);
      setTotalJobs(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No & ICD Code",
      size: 150,
      Cell: ({ cell }) => {
        const { job_no, custom_house, _id } = cell.row.original;
        return (
          <div
            style={{ textAlign: "center", cursor: "pointer", color: "blue" }}
            onClick={() => navigate(`/edit-billing-sheet/${_id}`)}
          >
            {job_no}
            <br />
            <small>{custom_house}</small>
          </div>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Party",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "obl_telex_bl",
      header: "OBL Telex BL",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "bill_document_sent_to_accounts",
      header: "Bill Doc Sent To Accounts",
      enableSorting: false,
      size: 300,
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enablePagination: false,
    muiTableContainerProps: { sx: { maxHeight: "650px", overflowY: "auto" } },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
    }),
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 1 } },
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Job Count Display */}
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontSize: "1.5rem", marginRight: "auto" }}
        >
          Job Count: {totalJobs}
        </Typography>
        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1); // Reset page on new search
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={fetchJobs}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px", marginRight: "20px", marginLeft: "20px" }}
        />
      </div>
    ),
  });

  const getTableRowsClassname = (row) => {
    const status = row.original.payment_made;
    return status === "Yes" ? "payment_made" : "";
  };

  const handlePageChange = (event, newPage) => setPage(newPage);

  return (
    <div style={{ height: "80%" }}>
      {error ? (
        <div>{error}</div>
      ) : (
        <>
          <MaterialReactTable table={table} />
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            sx={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "center",
            }}
          />
        </>
      )}
    </div>
  );
}

export default React.memo(BillingSheet);

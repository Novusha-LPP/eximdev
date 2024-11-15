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
} from "@mui/material";

function BillingSheet() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const limit = 100;
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Adjust debounce delay as needed

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch jobs based on search query and pagination
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING;
      if (!apiString) {
        throw new Error("API string not found in environment variables");
      }

      const res = await axios.get(`${apiString}/get-do-billing`, {
        params: {
          search: debouncedSearchQuery,
          page,
          limit,
        },
      });

      setRows(res.data.jobs || []);
      setTotalPages(res.data.totalPages || 1); // Set total pages based on response
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const renderLinkCell = (cell, path) => (
    <Link to={`/${path}/${cell.row.original._id}`}>
      {cell.row.original[cell.column.id]}
    </Link>
  );

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No & ICD Code",
      size: 150,
      Cell: ({ cell }) => {
        const jobNo = cell.row.original.job_no;
        const icdCode = cell.row.original.custom_house;
        const rowId = cell.row.original._id;

        return (
          <div
            style={{
              textAlign: "center",
              cursor: "pointer",
              color: "blue",
            }}
            onClick={() => navigate(`/edit-billing-sheet/${rowId}`)}
          >
            {jobNo}
            <br />
            <small>{icdCode}</small>
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
    enableGrouping: true,
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enablePagination: false,
    enableStickyHeader: true,
    enablePinning: true,
    enableBottomToolbar: false,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
    }),
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
          width: "100%",
        }}
      >
        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => fetchJobs()}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px", marginRight: "20px" }}
        />
      </div>
    ),
  });

  const getTableRowsClassname = (row) => {
    const status = row.original.payment_made;
    return status !== "No" && status !== undefined ? "payment_made" : "";
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable table={table} />
      {/* Pagination */}
      <Pagination
        count={totalPages}
        page={page}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
}

export default React.memo(BillingSheet);

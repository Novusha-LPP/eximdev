import * as React from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Box,
  Pagination,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname"; // Ensure this utility is correctly imported
function Submission() {
  const [rows, setRows] = React.useState([]);
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  const limit = 10; // Number of items per page

  // Fetch jobs with pagination and search
  const fetchJobs = async (currentPage = 1, currentSearchQuery = "") => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-submission-jobs`,
        {
          params: { page: currentPage, limit, search: currentSearchQuery },
        }
      );
      const { jobs, totalJobs, totalPages } = res.data;
      setRows(jobs);
      setTotalJobs(totalJobs);
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setRows([]);
      setTotalJobs(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Fetch jobs when page or debounced search query changes
  React.useEffect(() => {
    fetchJobs(page, debouncedSearchQuery);
  }, [page, debouncedSearchQuery]);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to the first page on new search
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      size: 150,
      Cell: ({ cell }) => {
        const { job_no, year, type_of_b_e, consignment_type, custom_house } =
          cell.row.original;
        return (
          <div
            onClick={() => navigate(`/submission-job/${job_no}/${year}`)}
            style={{
              cursor: "pointer",
              color: "blue",
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
            {custom_house}
          </div>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      size: 150,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Num & Date",
      size: 150,
      Cell: ({ cell }) => {
        const { awb_bl_no, awb_bl_date } = cell.row.original;
        return (
          <div>
            {awb_bl_no} <br /> {awb_bl_date}
          </div>
        );
      },
    },
    {
      accessorKey: "container_numbers",
      header: "Container Numbers and Size",
      size: 200,
      Cell: ({ cell }) => {
        const containerNos = cell.row.original.container_nos;
        return (
          <React.Fragment>
            {containerNos?.map((container, id) => (
              <div key={id} style={{ marginBottom: "4px" }}>
                {container.container_number}| "{container.size}"
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "gateway_igm_date",
      header: "Gateway IGM NO. & Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => {
        const { gateway_igm_date = "N/A", gateway_igm = "N/A" } = row.original;
        return (
          <div>
            <div>{`${gateway_igm}`}</div>
            <div>{`${gateway_igm_date}`}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "igm_no",
      header: "IGM NO. & Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => {
        const { igm_date = "N/A", igm_no = "N/A" } = row.original;
        return (
          <div>
            <div>{`${igm_no}`}</div>
            <div>{`${igm_date}`}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "invoice_number",
      header: "Invoice NO. & Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => {
        const { invoice_date = "N/A", invoice_number = "N/A" } = row.original;
        return (
          <div>
            <div>{`${invoice_number}`}</div>
            <div>{`${invoice_date}`}</div>
          </div>
        );
      },
    },
  ];

  const tableConfig = {
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false, // Handled manually via MUI Pagination
    enableBottomToolbar: false,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGlobalFilter: false,
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
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
          onChange={handleSearchInputChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => {
                    setDebouncedSearchQuery(searchQuery);
                    setPage(1);
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px", marginRight: "20px", marginLeft: "20px" }}
        />
      </div>
    ),
  };

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable {...tableConfig} />
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
    </div>
  );
}

export default React.memo(Submission);

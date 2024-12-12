import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate } from "react-router-dom";
import BLNumberCell from "../../utils/BLNumberCell";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import SearchIcon from "@mui/icons-material/Search";
function List() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const navigate = useNavigate();
  const limit = 100;

  const handleCopy = (event, text) => {
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Fetch jobs with pagination and search
  const fetchJobs = async (page = 1, searchQuery = "") => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/do-team-list-of-jobs`,
        { params: { page, limit, search: searchQuery } }
      );
      const { jobs = [], totalJobs = 0, totalPages = 1 } = res.data;
      setRows(jobs);
      setTotalJobs(totalJobs);
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setRows([]);
      setTotalJobs(0);
      setTotalPages(1);
    }
  };

  // Fetch jobs whenever page or debounced search query changes
  useEffect(() => {
    fetchJobs(page, debouncedSearchQuery);
  }, [page, debouncedSearchQuery]);

  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

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
            onClick={() => navigate(`/edit-do-list/${rowId}`)}
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
      header: "Importer",
      enableSorting: false,
      size: 250,
      Cell: ({ cell }) => {
        return (
          <React.Fragment>
            {cell?.getValue()?.toString()}

            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, cell?.getValue()?.toString());
              }}
            >
              <abbr title="Copy Party Name">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
          </React.Fragment>
        );
      },
    },

    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 200,
      Cell: ({ row }) => (
        <BLNumberCell
          blNumber={row.original.awb_bl_no}
          portOfReporting={row.original.port_of_reporting}
          shippingLine={row.original.shipping_line_airline}
          containerNos={row.original.container_nos}
        />
      ),
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
                <a
                  href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {container.container_number}
                </a>
                | "{container.size}"
                <IconButton
                  size="small"
                  onClick={(event) =>
                    handleCopy(event, container.container_number)
                  }
                >
                  <abbr title="Copy Container Number">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "vessel_and_voyage",
      header: "Vessel & Voyage No",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
        const voyageNo = row.original.voyage_no?.toString() || "N/A";

        const handleCopy = (event, text) => {
          event.stopPropagation();
          navigator.clipboard.writeText(text);
          alert(`${text} copied to clipboard!`);
        };

        return (
          <React.Fragment>
            <div>
              {vesselFlight}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, vesselFlight)}
              >
                <abbr title="Copy Vessel">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div>
              {voyageNo}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, voyageNo)}
              >
                <abbr title="Copy Voyage Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </React.Fragment>
        );
      },
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    }, // Set initial table density to compact
    enableGlobalFilter: false,
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enablePagination: false,
    enableStickyHeader: true,
    enableBottomToolbar: false,
    enablePinning: true,
    enableExpandAll: false,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    // muiTableBodyRowProps: ({ row }) => ({
    //   onClick: () => navigate(`/edit-do-list/${row.original._id}`), // Navigate on row click
    //   style: { cursor: "pointer" }, // Change cursor to pointer on hover
    // }),
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
    }),
    // renderDetailPanel: ({ row }) => {
    //   return (
    //     <div style={{ padding: "0 !important" }}>
    //       <DoPlanningContainerTable
    //         job_no={row.original.job_no}
    //         year={row.original.year}
    //       />
    //     </div>
    //   );
    // },
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
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => fetchJobs(1)}>
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

  return (
    <>
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
    </>
  );
}

export default React.memo(List);

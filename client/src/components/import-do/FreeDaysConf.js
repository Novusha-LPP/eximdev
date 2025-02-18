// FreeDaysConf.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import BLNumberCell from "../../utils/BLNumberCell";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

const FreeDaysConf = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total pages
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [loading, setLoading] = useState(false); // Loading state
  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // Debounced query
  const limit = 100; // Items per page

  const [editingRowId, setEditingRowId] = useState(null); // Track the row being edited
  const [freeTimeValue, setFreeTimeValue] = useState(""); // Track the value being edited
  const [currentPageBeforeEdit, setCurrentPageBeforeEdit] = useState(1);
  // Fetch jobs with pagination
  const fetchJobs = async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-free-days`,
        {
          params: { page, limit, search: searchQuery }, // Pass page, limit, and search query
        }
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch jobs when page or debounced search query changes
  useEffect(() => {
    fetchJobs(page, debouncedSearchQuery);
  }, [page, debouncedSearchQuery]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(handler); // Cleanup on component unmount
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage); // Update the page number
  };
  const handleCopy = (event, text) => {
    // Optimized handleCopy function using useCallback to avoid re-creation on each render

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

  const handleEditClick = (row) => {
    setEditingRowId(row._id); // Use the MongoDB `_id` field to identify the row
    setFreeTimeValue(row.free_time); // Set the current value for editing
    setCurrentPageBeforeEdit(page); // Remember the current page before editing
  };

  const handleSave = async (id) => {
    try {
      // API call to save the new value using PATCH
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-free-time/${id}`,
        {
          free_time: freeTimeValue,
        }
      );

      // // Update the state to reflect the new value
      // setRows((prevRows) =>
      //   prevRows.map((row) =>
      //     row._id === id ? { ...row, free_time: freeTimeValue } : row
      //   )
      // );
      // Fetch the latest jobs with the original page preserved
      await fetchJobs(currentPageBeforeEdit, debouncedSearchQuery);
      console.log("Free time updated successfully.");
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setEditingRowId(null); // Exit edit mode
    }
  };

  const handleCancel = () => {
    setEditingRowId(null); // Cancel edit mode
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No ",
      size: 120,
      Cell: ({ cell }) => {
        const { job_no, custom_house, type_of_b_e, consignment_type } =
          cell.row.original;
        return (
          <div style={{ textAlign: "center" }}>
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
            {custom_house}
          </div>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      size: 200,
    },

    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
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
      accessorKey: "free_time",
      header: "Free Time",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) =>
        editingRowId === row.original._id ? ( // Compare using _id
          <div style={{ display: "flex", alignItems: "center" }}>
            <TextField
              value={freeTimeValue}
              onChange={(e) => setFreeTimeValue(e.target.value)}
              size="small"
              variant="outlined"
              style={{ marginRight: "8px" }}
            />
            <IconButton onClick={() => handleSave(row.original._id)}>
              <CheckIcon />
            </IconButton>
            <IconButton onClick={handleCancel}>
              <CloseIcon />
            </IconButton>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center" }}>
            {row.original.free_time}
            <IconButton
              onClick={() => handleEditClick(row.original)}
              style={{ marginLeft: "8px" }}
            >
              <EditIcon />
            </IconButton>
          </div>
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

  const tableConfig = {
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
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
  };

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable {...tableConfig} />
      <Pagination
        count={totalPages}
        page={page}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
};

export default FreeDaysConf;

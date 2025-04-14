// FreeDaysConf.jsx
import React, { useEffect, useState, useCallback } from "react";
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
  MenuItem,
  Autocomplete
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";

const FreeDaysConf = () => {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [selectedICD, setSelectedICD] = useState("");
  const [years, setYears] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");
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

  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
        );
        setImporters(res.data);
      }
    }
    getImporterList();
  }, [selectedYearState]);
  // Function to build the search query (not needed on client-side, handled by server)
  // Keeping it in case you want to extend client-side filtering

  const getUniqueImporterNames = (importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const uniqueImporters = new Set();
    return importerData
      .filter((importer) => {
        if (uniqueImporters.has(importer.importer)) return false;
        uniqueImporters.add(importer.importer);
        return true;
      })
      .map((importer, index) => ({
        label: importer.importer,
        key: `${importer.importer}-${index}`,
      }));
  };

  const importerNames = [
    ...getUniqueImporterNames(importers),
  ];


  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
        const currentTwoDigits = String(currentYear).slice(-2);
        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

        let defaultYearPair =
          currentMonth >= 4
            ? `${currentTwoDigits}-${nextTwoDigits}`
            : `${prevTwoDigits}-${currentTwoDigits}`;

        if (!selectedYearState && filteredYears.length > 0) {
          setSelectedYearState(
            filteredYears.includes(defaultYearPair)
              ? defaultYearPair
              : filteredYears[0]
          );
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);

  // Fetch jobs with pagination
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      selectedImporter
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-free-days`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: currentYear,
              selectedICD: currentICD,
              importer: selectedImporter?.trim() || "", // ✅ Ensure parameter name matches backend
            },
          }
        );

        const {
          totalJobs,
          totalPages,
          currentPage: returnedPage,
          jobs,
        } = res.data;

        setRows(jobs);
        setTotalPages(totalPages);
        setPage(returnedPage); // Ensure the page state stays in sync
        setTotalJobs(totalJobs);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]); // Reset data on failure
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit] // Dependencies (limit is included if it changes)
  );

  // Fetch jobs when dependencies change
  useEffect(() => {
    fetchJobs(
      page,
      debouncedSearchQuery,
      selectedYearState,
      selectedICD,
      selectedImporter
    );
  }, [
    page,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    fetchJobs,
  ]);

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
      Cell: ({ row }) => {
        const line_no = row.original.line_no || "N/A";
        return (
          <>
           <BLNumberCell
          blNumber={row.original.awb_bl_no}
          portOfReporting={row.original.port_of_reporting}
          shippingLine={row.original.shipping_line_airline}
          containerNos={row.original.container_nos}

            />
                <div>
            { `Line No: ${line_no}`}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, line_no)}
              >
                <abbr title="Copy Line No Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </>
        )
      }
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
    {
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const { processed_be_attachment, cth_documents, checklist } =
          cell.row.original;

        // Helper function to safely get the first link if it's an array or a string
        const getFirstLink = (input) => {
          if (Array.isArray(input)) {
            return input.length > 0 ? input[0] : null;
          }
          return input || null;
        };

        const checklistLink = getFirstLink(checklist);
        const processed_be_attachmentLink = getFirstLink(
          processed_be_attachment
        );

        return (
          <div style={{ textAlign: "left" }}>
            {/* Render the "Checklist" link or fallback text */}
            {checklistLink ? (
              <div style={{ marginBottom: "5px" }}>
                <a
                  href={checklistLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Checklist
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>No Checklist </span>
              </div>
            )}
            {processed_be_attachmentLink ? (
              <div style={{ marginBottom: "5px" }}>
                <a
                  href={processed_be_attachmentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Processed Copy of BE no.
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>
                  {" "}
                  Processed Copy of BE no.{" "}
                </span>
              </div>
            )}

            {/* Render CTH Documents (showing actual URL) */}
            {cth_documents &&
            cth_documents.some(
              (doc) =>
                doc.url &&
                doc.url.length > 0 &&
                doc.document_name === "Pre-Shipment Inspection Certificate"
            ) ? (
              cth_documents
                .filter(
                  (doc) =>
                    doc.url &&
                    doc.url.length > 0 &&
                    doc.document_name === "Pre-Shipment Inspection Certificate"
                )
                .map((doc) => (
                  <div key={doc._id} style={{ marginBottom: "5px" }}>
                    <a
                      href={doc.url[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "blue",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      {doc.document_name}
                    </a>
                  </div>
                ))
            ) : (
              <span style={{ color: "gray" }}>
                {" "}
                No Pre-Shipment Inspection Certificate{" "}
              </span>
            )}
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
          justifyContent: "space-between",
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

        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""} // Controlled value
          onInputChange={(event, newValue) => setSelectedImporter(newValue)} // Handles input change
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer" // Placeholder text
            />
          )}
        />

        <TextField
          select
          size="small"
          value={selectedYearState}
          onChange={(e) => setSelectedYearState(e.target.value)}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          {years.map((year, index) => (
            <MenuItem key={`year-${year}-${index}`} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

        {/* ICD Code Filter */}
        <TextField
          select
          size="small"
          variant="outlined"
          label="ICD Code"
          value={selectedICD}
          onChange={(e) => {
            setSelectedICD(e.target.value); // Update the selected ICD code
            setPage(1); // Reset to the first page when the filter changes
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>
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

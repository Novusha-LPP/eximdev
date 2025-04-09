import * as React from "react";
import { useState, useEffect, useCallback , useContext} from "react";
import axios from "axios";
import { TabContext } from "../documentation/DocumentationTab.js";
import { MaterialReactTable } from "material-react-table";
import {
  IconButton,
  TextField,
  Box,
  Pagination,
  CircularProgress,
  Typography,
  InputAdornment,
  MenuItem,
  Autocomplete
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname"; // Ensure this utility is correctly imported
import { useNavigate } from "react-router-dom";
import { YearContext } from "../../contexts/yearContext.js";

function DocumentationCompletedd() {

    const { currentTab } = useContext(TabContext); // Access context
 const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [years, setYears] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");
  const [rows, setRows] = React.useState([]);
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const limit = 100; // Number of items per page

  // Get importer list for MUI autocomplete
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

  const importerNames = [...getUniqueImporterNames(importers)];

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

  // Fetch jobs with pagination and search
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedImporter,
      selectedYearState
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-documentation-completed-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "", // ✅ Send year to backend
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
        setPage(returnedPage);
        setTotalJobs(totalJobs);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]); // Reset rows if an error occurs
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit, selectedImporter, selectedYearState] // ✅ Add selectedYear as a dependency
  );

  // Fetch jobs when page or debounced search query changes
 useEffect(() => {
   if (selectedYearState) {
     // Ensure year is available before calling API
     fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYearState);
   }
 }, [
   page,
   debouncedSearchQuery,
   selectedImporter,
   selectedYearState,
   fetchJobs,
 ]);

  // Debounce search input to avoid excessive API calls
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page on new search
    }, 500); // 500ms delay

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
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const {
          job_no,
          year,
          type_of_b_e,
          consignment_type,
          custom_house,
          priorityColor, // Add priorityColor from API response
        } = cell.row.original;

        return (
          <div
            onClick={() =>
              navigate(`/documentationJob/view-job/${job_no}/${year}`, {
                state: { currentTab: 1 },
              })
            }
            style={{
              cursor: "pointer",
              color: "blue",
              backgroundColor:
                cell.row.original.priorityJob === "High Priority"
                  ? "orange"
                  : cell.row.original.priorityJob === "Priority"
                  ? "yellow"
                  : "transparent", // Dynamically set the background color
              padding: "10px", // Add padding for better visibility
              borderRadius: "5px", // Optional: Add some styling for aesthetics
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
            {custom_house}
            <br />
          </div>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Num & Date",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const { awb_bl_no, awb_bl_date } = cell.row.original; // Destructure properties here
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
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const { cth_documents, all_documents } = cell.row.original;

        return (
          <div style={{ textAlign: "left" }}>
            {" "}
            {/* Ensure all content aligns to the left */}
            {/* Render CTH Documents with URLs */}
            {cth_documents
              ?.filter((doc) => doc.url && doc.url.length > 0) // Only include documents with a URL
              .map((doc) => (
                <div key={doc._id} style={{ marginBottom: "5px" }}>
                  <a
                    href={doc.url[0]} // Use the first URL in the array
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
              ))}
            {/* Render All Documents */}
            {all_documents?.map((docUrl, index) => (
              <div key={`doc-${index}`} style={{ marginBottom: "5px" }}>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "green",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Doc{index + 1}
                </a>
              </div>
            ))}
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
    // muiTableBodyRowProps: ({ row }) => ({
    //   className: getTableRowsClassname(row),
    // }),
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

export default React.memo(DocumentationCompletedd);

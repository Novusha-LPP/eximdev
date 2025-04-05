import React, { useEffect, useState, useCallback } from "react";
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
  MenuItem,
  Autocomplete,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname"; // Ensure this utility is correctly imported
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";

function Submission() {
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

  const limit = 10; // Number of items per page

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

  // useEffect(() => {
  //   if (!selectedImporter) {
  //     setSelectedImporter("Select Importer");
  //   }
  // }, [importerNames]);

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
          `${process.env.REACT_APP_API_STRING}/get-submission-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              year: selectedYearState || "", // ✅ Ensure year is sent
              search: currentSearchQuery,
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
    [limit, selectedImporter, selectedYearState] // Dependency array remains the same
  );

  // Fetch jobs when page or debounced search query changes
   useEffect(() => {
     fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYearState);
   }, [
     page,
     debouncedSearchQuery,
     selectedImporter,
     selectedYearState,
     fetchJobs,
   ]); 
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
            onClick={() => navigate(`/submission-job/${job_no}/${year}`)}
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
    {
      accessorKey: "cth_documents",
      header: "E-sanchit Doc",
      enableSorting: false,
      size: 300,
      Cell: ({ row }) => {
        const { cth_documents = [] } = row.original;

        return (
          <div style={{ textAlign: "left" }}>
            {cth_documents.length > 0 ? (
              cth_documents.map((doc, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "5px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <a
                    href={doc.url[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "#007bff",
                      display: "block",
                    }}
                  >
                    {`${doc.document_code} - ${doc.document_name}${
                      doc.irn ? ` - ${doc.irn}` : ""
                    }`}
                  </a>
                  {/* Uncomment the following if you want to display the date */}
                  {/* <div style={{ fontSize: "12px", color: "#555" }}>
                    Checked Date:{" "}
                    {new Date(doc.document_check_date).toLocaleDateString()}
                  </div> */}
                </div>
              ))
            ) : (
              <div>No Documents Available</div>
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
    muiTableBodyCellProps: {
      sx: {
        textAlign: "left", // Ensures all cells in the table body align to the left
      },
    },

    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
    }),
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        textAlign: "left",
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

export default React.memo(Submission);

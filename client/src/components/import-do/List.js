import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate, useLocation } from "react-router-dom";
import BLNumberCell from "../../utils/BLNumberCell";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  MenuItem,
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
  const location = useLocation();
  const limit = 100;
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );

  const [loading, setLoading] = useState(false); 

  const [selectedYear, setSelectedYear] = useState("");
  const [years, setYears] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");
  const [selectedICD, setSelectedICD] = useState("");

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

  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`
        );
        setImporters(res.data);
        setSelectedImporter("Select Importer");
      }
    }
    getImporterList();
  }, [selectedYear]);
  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`
        );
        setImporters(res.data);
        setSelectedImporter("Select Importer");
      }
    }
    getImporterList();
  }, [selectedYear]);
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
    { label: "Select Importer" },
    ...getUniqueImporterNames(importers),
  ];

  useEffect(() => {
    if (!selectedImporter) {
      setSelectedImporter("Select Importer");
    }
  }, [importerNames]);

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

        if (!selectedYear && filteredYears.length > 0) {
          setSelectedYear(
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
  }, [selectedYear, setSelectedYear]);

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
          `${process.env.REACT_APP_API_STRING}/do-team-list-of-jobs`,
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
      selectedYear,
      selectedICD,
      selectedImporter
    );
  }, [
    page,
    debouncedSearchQuery,
    selectedYear,
    selectedICD,
    selectedImporter,
    fetchJobs,
  ]);
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
  // const getCustomHouseLocation = useMemo(
  //   () => (customHouse) => {
  //     const houseMap = {
  //       "ICD SACHANA": "SACHANA ICD (INJKA6)",
  //       "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
  //       "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
  //     };
  //     return houseMap[customHouse] || customHouse;
  //   },
  //   []
  // );
  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No ",
      size: 120,
      Cell: ({ cell }) => {
        const { job_no, custom_house, _id, type_of_b_e, consignment_type } =
          cell.row.original;
        
        return (
          <div
            style={{
              // If the row matches the selected ID, give it a highlight
              backgroundColor:
                selectedJobId === _id ? "#ffffcc" : "transparent",
              textAlign: "center",
              cursor: "pointer",
              color: "blue",
            }}
            onClick={() => {
              // 1) Set the selected job in state so we can highlight it
              setSelectedJobId(_id);

              // 2) Navigate to the detail page, and pass selectedJobId
              navigate(`/edit-do-list/${_id}`, {
                state: {
                  selectedJobId: _id,
                },
              });
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
    
        {/* Importer Filter */}
        <TextField
          fullWidth
          select
          size="small"
          value={selectedImporter || ""}
          onChange={(e) => setSelectedImporter(e.target.value)}
          label="Select Importer"
          sx={{ width: "200px", marginRight: "20px" }}
        >
          {importerNames.map((option, index) => (
            <MenuItem key={`importer-${index}`} value={option.label}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
    
        {/* Year Filter */}
        <TextField
          select
          size="small"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
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
          {[
            { key: "all", label: "All ICDs" },
            { key: "sanand", label: "ICD SANAND" },
            { key: "khodiyar", label: "ICD KHODIYAR" },
            { key: "sachana", label: "ICD SACHANA" },
          ].map((icd) => (
            <MenuItem key={`icd-${icd.key}`} value={icd.label}>
              {icd.label}
            </MenuItem>
          ))}
        </TextField>
    
        {/* Search Field */}
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

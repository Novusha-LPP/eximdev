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
  Autocomplete,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import SearchIcon from "@mui/icons-material/Search";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";

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
  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");
  const [selectedICD, setSelectedICD] = useState("");

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return; // Prevent copying empty values
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Copied:", text))
        .catch((err) => console.error("Copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Copied (fallback):", text);
      } catch (err) {
        console.error("Fallback failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };
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
          const newYear = filteredYears.includes(defaultYearPair)
            ? defaultYearPair
            : filteredYears[0];

          setSelectedYearState(newYear); // ✅ Persist the selected year
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

  // Fetch jobs with pagination
  useEffect(() => {
    fetchJobs(
      page,
      debouncedSearchQuery,
      selectedYearState, // ✅ Now using the persistent state
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
      accessorKey: "be_no_igm_details",
      header: "Bill Of Entry & IGM Details",
      enableSorting: false,
      size: 300,
      Cell: ({ cell }) => {
        const {
          be_no,
          igm_date,
          igm_no,
          be_date,
          gateway_igm_date,
          gateway_igm,
        } = cell.row.original;

        return (
          <div>
            <strong>BE No:</strong> {be_no || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, be_no)}
            >
              <abbr title="Copy BE No">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>BE Date:</strong> {be_date || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, be_date)}
            >
              <abbr title="Copy BE Date">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>GIGM:</strong> {gateway_igm || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, gateway_igm)}
            >
              <abbr title="Copy GIGM">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>GIGM Date:</strong> {gateway_igm_date || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, gateway_igm_date)}
            >
              <abbr title="Copy GIGM Date">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>IGM No:</strong> {igm_no || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, igm_no)}
            >
              <abbr title="Copy IGM No">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>IGM Date:</strong> {igm_date || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, igm_date)}
            >
              <abbr title="Copy IGM Date">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
          </div>
        );
      },
    },

    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 200,
      Cell: ({ row }) => {
        const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
        const voyageNo = row.original.voyage_no?.toString() || "N/A";
        const line_no = row.original.line_no || "N/A";

        return (
          <React.Fragment>
            <BLNumberCell
              blNumber={row.original.awb_bl_no}
              portOfReporting={row.original.port_of_reporting}
              shippingLine={row.original.shipping_line_airline}
              containerNos={row.original.container_nos}
            />

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
             { `Vessel Voyage: ${voyageNo}`}
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
            <div>
            <span>{`Line No: ${line_no}`}</span>
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, line_no)}
              >
                <abbr title="Copy Line Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </React.Fragment>
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
    // {
    //   accessorKey: "vessel_and_voyage",
    //   header: "Vessel & Voyage No",
    //   enableSorting: false,
    //   size: 200,
    //   Cell: ({ row }) => {
    //     const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
    //     const voyageNo = row.original.voyage_no?.toString() || "N/A";

    //     const handleCopy = (event, text) => {
    //       event.stopPropagation();
    //       navigator.clipboard.writeText(text);
    //       alert(`${text} copied to clipboard!`);
    //     };

    //     return (
    //       <React.Fragment>
    //         <div>
    //           {vesselFlight}
    //           <IconButton
    //             size="small"
    //             onPointerOver={(e) => (e.target.style.cursor = "pointer")}
    //             onClick={(event) => handleCopy(event, vesselFlight)}
    //           >
    //             <abbr title="Copy Vessel">
    //               <ContentCopyIcon fontSize="inherit" />
    //             </abbr>
    //           </IconButton>
    //         </div>

    //         <div>
    //           {voyageNo}
    //           <IconButton
    //             size="small"
    //             onPointerOver={(e) => (e.target.style.cursor = "pointer")}
    //             onClick={(event) => handleCopy(event, voyageNo)}
    //           >
    //             <abbr title="Copy Voyage Number">
    //               <ContentCopyIcon fontSize="inherit" />
    //             </abbr>
    //           </IconButton>
    //         </div>
    //       </React.Fragment>
    //     );
    //   },
    // },

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

        {/* Year Filter */}
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

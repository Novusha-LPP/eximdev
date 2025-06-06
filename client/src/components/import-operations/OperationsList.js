import React, { useState, useCallback, useMemo, useEffect } from "react";
import "../../styles/import-dsr.scss";
import {
  MenuItem,
  TextField,
  IconButton,
  Pagination,
  InputAdornment,
  Typography,
  Autocomplete,
} from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { UserContext } from "../../contexts/UserContext";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate, useLocation } from "react-router-dom";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import JobStickerPDF from "../import-dsr/JobStickerPDF";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";

function OperationsList() {
  const [selectedICD, setSelectedICD] = useState("");
  const [years, setYears] = React.useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");
  const [loading, setLoading] = useState(false); // Loading state
  const [rows, setRows] = React.useState([]);
  const { user } = React.useContext(UserContext);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
    const location = useLocation();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const limit = 100;

  const navigate = useNavigate();

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
          `${process.env.REACT_APP_API_STRING}/get-operations-planning-list/${user.username}`,
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
    if (selectedYearState) {
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter
      );
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    fetchJobs,
  ]);

   // Handle search input with debounce
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
      }, 500); // 500ms debounce delay
      return () => clearTimeout(handler);
    }, [searchQuery]);
    useEffect(() => {
      if (location.state?.searchQuery) {
        setSearchQuery(location.state.searchQuery);
      }
    }, [location.state?.searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const getCustomHouseLocation = useMemo(
    () => (customHouse) => {
      const houseMap = {
        "ICD SACHANA": "SACHANA ICD (INJKA6)",
        "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
        "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
      };
      return houseMap[customHouse] || customHouse;
    },
    []
  );

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

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const { job_no, year, type_of_b_e, consignment_type, custom_house } =
          row.original;

        return (
          <div
            onClick={() =>
              navigate(
                `/import-operations/list-operation-job/${job_no}/${year}`
              )
            }
            style={{
              cursor: "pointer",
              color: "blue",
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />
            {custom_house}
          </div>
        );
      },
    },
    {
      accessorKey: "be_no",
      header: "BE Number and Date",
      size: 150, // Adjusted size to fit both BE Number and Date
      Cell: ({ cell }) => {
        const beNumber = cell?.getValue()?.toString();
        const rawBeDate = cell.row.original.be_date;
        const customHouse = cell.row.original.custom_house;

        const beDate = formatDate(rawBeDate);
        const location = getCustomHouseLocation(customHouse);

        return (
          <React.Fragment>
            {beNumber && (
              <React.Fragment>
                <a
                  href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}&beTrack_location=${location}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {beNumber}
                </a>

                {beDate}
              </React.Fragment>
            )}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "be_date",
      header: "BE Date",
      enableSorting: false,
      size: 120,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "importer",
      header: "Importer Name", // Add importer column
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    // {
    //   accessorKey: "custom_house",
    //   header: "ICD Code",
    //   enableSorting: false,
    //   size: 150,
    //   Cell: ({ cell }) => (
    //     <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
    //   ),
    // },
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
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const { cth_documents, all_documents, job_sticker_upload, checklist } =
          cell.row.original;

        // Helper function to safely get the first link if it's an array or a string
        const getFirstLink = (input) => {
          if (Array.isArray(input)) {
            return input.length > 0 ? input[0] : null;
          }
          return input || null;
        };

        const stickerLink = getFirstLink(job_sticker_upload);
        const checklistLink = getFirstLink(checklist);

        return (
          <div style={{ textAlign: "left" }}>
            {/* Render the "Sticker" link or fallback text
            {stickerLink ? (
              <div style={{ marginBottom: "5px" }}>
                <a
                  href={stickerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Sticker
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>No Sticker </span>
              </div>
            )} */}

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

            {/* Render CTH Documents (showing actual URL) */}
            {cth_documents
              ?.filter((doc) => doc.url && doc.url.length > 0)
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
              ))}

            {/* Render All Documents (showing actual URL) */}
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
    {
      id: "js",
      header: "Job Sticker",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        // 1) Create a ref for the JobStickerPDF child
        const pdfRef = React.useRef(null);

        // 2) Handler calls the child method
        const handleGenerate = () => {
          pdfRef.current?.generatePdf();
        };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* 3) The invisible child that has .generatePdf() */}
            <JobStickerPDF ref={pdfRef} data={row.original} />

            {/* 4) A button that triggers PDF generation */}
            <button
              onClick={handleGenerate}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                borderRadius: "6px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                cursor: "pointer",
              }}
            >
              Generate Job Sticker
            </button>
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

export default React.memo(OperationsList);

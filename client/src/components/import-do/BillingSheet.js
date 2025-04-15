import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";

import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";

function BillingSheet() {
   const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [selectedICD, setSelectedICD] = useState("");
  const [blValue, setBlValue] = useState("");

    const [years, setYears] = useState([]);
    const [selectedImporter, setSelectedImporter] = useState("");
    const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [totalJobs, setTotalJobs] = React.useState(0);
  const limit = 100;
  const navigate = useNavigate();
  const location = useLocation();
  const listRef = useRef(null);

  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );
  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);
  useEffect(() => {
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
    }
  }, [location.state?.searchQuery]);

  // Restore scroll position on component mount
  useEffect(() => {
    if (location.state?.scrollPosition && listRef.current) {
      listRef.current.scrollTo(0, location.state.scrollPosition);
    }
  }, [location.state?.scrollPosition]);

  // Save scroll position before component unmounts
  useEffect(() => {
    return () => {
      if (listRef.current) {
        const scrollPosition = listRef.current.scrollTop;
        window.history.replaceState(
          {
            ...window.history.state,
            scrollPosition,
          },
          ""
        );
      }
    };
  }, []);


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

  
  // Fetch jobs based on search query and pagination
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      OBLvalue,
      selectedImporter
    ) => {
      setLoading(true);
      try {

        
        const apiString =
        process.env.REACT_APP_API_STRING || "http://localhost:5000"; // Fallback for dev
      const res = await axios.get(`${apiString}/get-do-billing`, {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: currentYear,
              selectedICD: currentICD,
              obl_telex_bl: OBLvalue.trim(),
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
      blValue,
      selectedImporter
    );
  }, [
    page,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    blValue,
    selectedImporter,
    fetchJobs,
  ]);


  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
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
              navigate(`/edit-billing-sheet/${_id}`, {
                state: {
                  selectedJobId: _id,
                  searchQuery,
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
      header: "BL",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "bill_document_sent_to_accounts",
      header: "Bill Doc Sent To Accounts",
      enableSorting: false,
      size: 300,
    },

    {
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const {
          shipping_line_invoice_imgs = [],
          concor_invoice_and_receipt_copy = [],
          ooc_copies = [],
          cth_documents = [],
        } = cell.row.original;

        // Helper function to safely extract links from arrays
        const getLinks = (input) => {
          return Array.isArray(input) && input.length > 0 ? input : [];
        };

        return (
          <div style={{ textAlign: "left" }}>
            {/* Shipping Line Invoice Received */}
            {shipping_line_invoice_imgs.length > 0 ? (
              shipping_line_invoice_imgs.map((doc, index) => (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "blue",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Shipping Line Invoice {index + 1}
                  </a>
                </div>
              ))
            ) : (
              <div style={{ marginBottom: "5px", color: "gray" }}>
                No Shipping Line Invoice
              </div>
            )}

            {/* Concor Invoice and Receipt Copy */}
            {concor_invoice_and_receipt_copy.length > 0 ? (
              concor_invoice_and_receipt_copy.map((doc, index) => (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "blue",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Concor Invoice {index + 1}
                  </a>
                </div>
              ))
            ) : (
              <div style={{ marginBottom: "5px", color: "gray" }}>
                No Concor Invoice
              </div>
            )}

            {/* OOC Copies */}
            {ooc_copies.length > 0 ? (
              ooc_copies.map((doc, index) => (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "blue",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    OOC Copy {index + 1}
                  </a>
                </div>
              ))
            ) : (
              <div style={{ marginBottom: "5px", color: "gray" }}>
                No OOC Copies
              </div>
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
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enablePagination: false,
    muiTableContainerProps: { sx: { maxHeight: "650px", overflowY: "auto" } },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
    }),
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 1 } },
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
          select
          size="small"
          variant="outlined"
          label="OBL"
          value={blValue}
          onChange={(e) => setBlValue(e.target.value)}
          sx={{ width: "200px", marginRight: "20px" }}
        > <MenuItem value="">Select OBL</MenuItem>
          <MenuItem value="Original Documents">Original Documents</MenuItem>
          <MenuItem value="Telex">Telex</MenuItem>
          <MenuItem value="Surrender BL">Surrender BL</MenuItem>
          <MenuItem value="Waybill">Waybill</MenuItem>
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
  });

  const getTableRowsClassname = (row) => {
    const status = row.original.payment_made;
    return status === "Yes" ? "payment_made" : "";
  };

  const handlePageChange = (event, newPage) => setPage(newPage);

  return (
    <div ref={listRef} style={{ height: "80%", overflow: "auto" }}>
      {error ? (
        <div>{error}</div>
      ) : (
        <>
          <MaterialReactTable table={table} />
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            sx={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "center",
            }}
          />
        </>
      )}
    </div>
  );
}

export default React.memo(BillingSheet);

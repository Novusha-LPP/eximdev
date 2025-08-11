import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  MenuItem,
  Autocomplete,
  colors,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import BLNumberCell from "../../utils/BLNumberCell";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

function DoCompleted() {
  const [selectedICD, setSelectedICD] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [years, setYears] = useState([]);
  const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1); // Total pages from API
  const [loading, setLoading] = useState(false); // Loading state
  // Use context for searchQuery, selectedImporter, and currentPage for DO Completed tab
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter, currentPageDoTab2: currentPage, setCurrentPageDoTab2: setCurrentPage } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced query
  const navigate = useNavigate();
  const location = useLocation();
  const [totalJobs, setTotalJobs] = React.useState(0);
  const limit = 100; // Number of items per page
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);


  // Restore pagination/search state when returning from job details
  React.useEffect(() => {
    if (location.state?.fromJobDetails) {
      if (location.state?.searchQuery !== undefined) {
        setSearchQuery(location.state.searchQuery);
      }
      if (location.state?.selectedImporter !== undefined) {
        setSelectedImporter(location.state.selectedImporter);
      }
      if (location.state?.selectedJobId !== undefined) {
        setSelectedJobId(location.state.selectedJobId);
      }
      if (location.state?.currentPage !== undefined) {
        setCurrentPage(location.state.currentPage);
      }
    } else {
      // Clear state on fresh tab navigation (handled by parent tab component)
      setSelectedJobId(null);
    }
  }, [setSearchQuery, setSelectedImporter, setCurrentPage, location.state]);

  const formatDate = useCallback((dateStr) => {
    if (dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    } else {
      return dateStr;
    }
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
  }, [selectedYearState, setSelectedYear]);

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

  // Fetch jobs with pagination and search
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
          `${process.env.REACT_APP_API_STRING}/get-do-complete-module-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: currentYear,
              selectedICD: currentICD,
              importer: selectedImporter?.trim() || "",
              username: user?.username || "", // ✅ Send username for ICD filtering
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
        setTotalJobs(totalJobs);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit, user?.username] // Dependencies - add username
  );

  // Fetch jobs when dependencies change
  useEffect(() => {
    if (selectedYearState && user?.username) {
      // Ensure year and username are available before calling API
      fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter
      );
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    user?.username,
    fetchJobs,
  ]);

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page when user types
  };

  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
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
          _id,
          custom_house,
          priorityColor,
        } = cell.row.original;
        const textColor = "blue";
        const bgColor = cell.row.original.priorityJob === "High Priority"
          ? "orange"
          : cell.row.original.priorityJob === "Priority"
          ? "yellow"
          : "transparent";
        const isSelected = selectedJobId === _id;
        // Get selectedImporter, currentPage, searchQuery from context
        // ...existing code...
        return (
          <Link
            to={`/edit-do-completed/${job_no}/${year}?jobId=${_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSelectedJobId(_id)}
            style={{
              backgroundColor: isSelected ? "#ffffcc" : bgColor,
              textAlign: "center",
              cursor: "pointer",
              color: textColor,
              display: "inline-block",
              width: "100%",
              padding: "5px",
              textDecoration: "none",
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />
            {custom_house}
          </Link>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 250,
      Cell: ({ cell, row }) => {
        const importerName = cell?.getValue()?.toString();
        const _id = row.original._id;
        const isDoDocPrepared = row.original.is_do_doc_prepared || false;
        const [checked, setChecked] = React.useState(isDoDocPrepared);

        // Get payment_recipt_date and payment_request_date from do_shipping_line_invoice[0] if present
        const doShippingLineInvoice = row.original.do_shipping_line_invoice;
        let paymentReciptDate = '';
        let paymentRequestDate = '';
        if (Array.isArray(doShippingLineInvoice) && doShippingLineInvoice.length > 0) {
          paymentReciptDate = doShippingLineInvoice[0].payment_recipt_date;
          paymentRequestDate = doShippingLineInvoice[0].payment_request_date;
        }
        return (
          <React.Fragment>
            {importerName}
            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, importerName);
              }}
            >
              <abbr title="Copy Party Name">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            {/* Show payment request info if available */}
            {paymentRequestDate && (
              <>
                <div style={{ color: '#d32f2f', fontWeight: 500, fontSize: '12px', marginTop: 4 }}>
                  Payment request sent to billing team
                </div>
                <div style={{ color: '#0288d1', fontWeight: 500, fontSize: '12px', marginBottom: 2 }}>
                 Payment Request Date: {new Date(paymentRequestDate).toLocaleString('en-IN', { hour12: true })}
                </div>
              </>
            )}
            {/* Show payment receipt links if available */}
            {Array.isArray(doShippingLineInvoice) && doShippingLineInvoice.length > 0 && doShippingLineInvoice.map((invoice, idx) =>
              invoice.payment_recipt && invoice.payment_recipt.length > 0 ? (
                <div key={idx} style={{ fontSize: '11px', color: '#388e3c', marginTop: '2px' }}>
                  {invoice.payment_recipt.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#388e3c', textDecoration: 'underline', marginRight: 8 }}
                    >
                      View Payment Receipt {doShippingLineInvoice.length > 1 ? `(${idx + 1})` : ''}
                    </a>
                  ))}
                </div>
              ) : null
            )}
            {paymentReciptDate && (
              <div style={{ fontSize: '11px', color: '#1976d2', marginTop: '2px' }}>
                Payment Receipt Uploaded: {new Date(paymentReciptDate).toLocaleString('en-IN', { hour12: true })}
              </div>
            )}
            <br />
          </React.Fragment>
        );
      },
    },
    // {
    //   accessorKey: "importer_address",
    //   header: "Address",
    //   enableSorting: false,
    //   size: 250,
    //   Cell: ({ cell }) => {
    //     return (
    //       <React.Fragment>
    //         {cell?.getValue()?.toString()}

    //         <IconButton
    //           size="small"
    //           onPointerOver={(e) => (e.target.style.cursor = "pointer")}
    //           onClick={(event) => {
    //             handleCopy(event, cell?.getValue()?.toString());
    //           }}
    //         >
    //           <abbr title="Copy Party Address">
    //             <ContentCopyIcon fontSize="inherit" />
    //           </abbr>
    //         </IconButton>
    //         <br />
    //       </React.Fragment>
    //     );
    //   },
    // },

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
        <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
          <strong>BE No:</strong> {be_no || "N/A"}{" "}
          <IconButton 
            size="small" 
            onClick={(event) => handleCopy(event, be_no)}
            sx={{ padding: "2px", marginLeft: "4px" }}
          >
            <abbr title="Copy BE No">
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>
        </div>

        <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
          <strong>BE Date:</strong> {be_date || "N/A"}{" "}
          <IconButton 
            size="small" 
            onClick={(event) => handleCopy(event, be_date)}
            sx={{ padding: "2px", marginLeft: "4px" }}
          >
            <abbr title="Copy BE Date">
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>
        </div>

        <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
          <strong>GIGM:</strong> {gateway_igm || "N/A"}{" "}
          <IconButton 
            size="small" 
            onClick={(event) => handleCopy(event, gateway_igm)}
            sx={{ padding: "2px", marginLeft: "4px" }}
          >
            <abbr title="Copy GIGM">
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>
        </div>

        <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
          <strong>GIGM Date:</strong> {gateway_igm_date || "N/A"}{" "}
          <IconButton 
            size="small" 
            onClick={(event) => handleCopy(event, gateway_igm_date)}
            sx={{ padding: "2px", marginLeft: "4px" }}
          >
            <abbr title="Copy GIGM Date">
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>
        </div>

        <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
          <strong>IGM No:</strong> {igm_no || "N/A"}{" "}
          <IconButton 
            size="small" 
            onClick={(event) => handleCopy(event, igm_no)}
            sx={{ padding: "2px", marginLeft: "4px" }}
          >
            <abbr title="Copy IGM No">
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>
        </div>

        <div style={{ marginBottom: "2px", display: "flex", alignItems: "center" }}>
          <strong>IGM Date:</strong> {igm_date || "N/A"}{" "}
          <IconButton 
            size="small" 
            onClick={(event) => handleCopy(event, igm_date)}
            sx={{ padding: "2px", marginLeft: "4px" }}
          >
            <abbr title="Copy IGM Date">
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>
        </div>
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

    {
      accessorKey: "displayDate", // Use the backend-calculated `displayDate` field
      header: "Required Do Validity Upto",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const displayDate = cell.getValue(); // "displayDate" from backend
        const dayDifference = row.original.dayDifference; // "dayDifference" from backend
        const  typeOfDo = row.original.type_of_Do; // "dayDifference" from backend

              const do_list = row.original.do_list; // "do_list" from backend
        return (
          <div
            style={{
              backgroundColor: dayDifference > 0 ? "#FFCCCC" : "#CCFFCC", // Red if dayDifference is positive
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            {displayDate}{" "}
            
            {dayDifference > 0 && <div>(+{dayDifference} days)</div>}
            <div>Type Of Do: {typeOfDo}</div>

            <strong> EmptyOff LOC:</strong> {do_list}
          </div>
        );
      },
    },
    {
      accessorKey: "do_revalidation_upto",
      header: "DO Revalidation Upto",
      size: 180,
      Cell: ({ cell }) => {
        const containers = cell.row.original.container_nos; // Access all containers

        return (
          <React.Fragment>
            {containers.map((container, containerIndex) => {
              // Check if the container has `do_revalidation` data
              const revalidationData = container.do_revalidation || [];

              return (
                <div
                  key={container.container_number}
                  style={{ marginBottom: "8px" }}
                >
                  {revalidationData.length === 0 ? (
                    <div></div>
                  ) : (
                    revalidationData.map((item, index) => (
                      <div key={item._id} style={{ marginBottom: "4px" }}>
                        {/* Display rank number and revalidation date */}
                        {containerIndex + 1}.{index + 1}.{" "}
                        {item.do_revalidation_upto || "N/A"}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
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
    // {
    //   accessorKey: "type_of_Do",
    //   header: "Type of Do",
    //   enableSorting: false,
    //   size: 120,
    // },
    {
      accessorKey: "Doc",
      header: "Do Completed  & Validity Date",
      enableSorting: false,
      size: 200,
      Cell: ({ cell }) => {
        const {
          do_completed,
          do_validity,
          do_copies,
          cth_documents
        } = cell.row.original;

        const doCopies = do_copies
        const doCompleted = formatDate(do_completed)
        const doValidity =  formatDate(do_validity)
        

        return (
          <div style={{ textAlign: "left" }}>
            {/* Render the "Checklist" link or fallback text */}
            {cth_documents &&
            cth_documents.some(
              (doc) =>
                doc.url &&
                doc.url.length > 0 &&
                (
                  doc.document_name === "Bill of Lading")
            ) ? (
              cth_documents
                .filter(
                  (doc) =>
                    doc.url &&
                    doc.url.length > 0 &&
                    (
                      doc.document_name === "Bill of Lading")
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
                No Bill of Lading{" "}
              </span>
            )}  

          <div>
  {doCompleted ? (
    <strong>DO Completed Date: {doCompleted}</strong>
  ) : (
    <span style={{color: "gray"}}>No DO Completed Date</span>
  )}
</div>
<div>
  {doValidity ? (
    <strong>DO Validity: {doCompleted}</strong>
  ) : (
    <span style={{color: "gray"}}>No DO Validity</span>
  )}
</div>

           
            {Array.isArray(doCopies) && doCopies.length > 0 ? (
              <div style={{ marginTop: "4px" }}>
                {doCopies.map((url, index) => (
                  <div key={index}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#007bff", textDecoration: "underline" }}
                    >
                      DO Copy {index + 1}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>
                  {" "}
                 No DO copies{" "}
                </span>
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
    enableDensityToggle: false, // Disable density toggle
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableGlobalFilter: false,
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enablePagination: false,
    enableStickyHeader: true,
    enablePinning: true,
    enableBottomToolbar: false,
    // enableExpandAll: false,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      // onClick: () => navigate(`/edit-do-planning/${row.original._id}`), // Navigate on row click
      // style: { cursor: "pointer" }, // Change cursor to pointer on hover
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
        </Typography>        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""} // Controlled value
          onInputChange={(event, newValue) => {
            setSelectedImporter(newValue);
            setCurrentPage(1); // Reset to first page when importer changes
          }} // Handles input change
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
            setCurrentPage(1); // Reset to the first page when the filter changes
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>        <TextField
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
                    setCurrentPage(1);
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
  });

  const getTableRowsClassname = (params) => {
    const status = params.original.payment_made;
    if (status !== "No" && status !== undefined) {
      return "payment_made";
    } else {
      return "";
    }
  };

  return (
    <div style={{ height: "80%" }}>
      {/* Search Input */}

      {/* Table */}
      <MaterialReactTable table={table} />

      {/* Pagination */}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
}

export default React.memo(DoCompleted);

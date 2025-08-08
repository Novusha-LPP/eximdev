import React, { useState, useEffect, useRef , useCallback} from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate, useLocation } from "react-router-dom";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  MenuItem,
  Autocomplete,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import BLNumberCell from "../../utils/BLNumberCell";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

function DoPlanning() {
  const [doDocCounts, setDoDocCounts] = useState({
  totalJobs: 0,
  prepared: 0,
  notPrepared: 0
});
  
  // ✅ State for status filter counts
  const [statusFilterCounts, setStatusFilterCounts] = useState({});
  
   const [selectedICD, setSelectedICD] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [years, setYears] = useState([]);
  const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page
  const [totalPages, setTotalPages] = useState(1); // Total pages from API
  const [loading, setLoading] = useState(false); // Loading state
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(""); // New status filter state
  // Use context for search functionality like E-Sanchit
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter, currentPageDoTab1: currentPage, setCurrentPageDoTab1: setCurrentPage } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced query
  const navigate = useNavigate();
  const location = useLocation();
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [totalJobs, setTotalJobs] = React.useState(0);
  const limit = 100; // Number of items per page
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);

  // Status filter options with dynamic counts and styled badges
  const statusFilterOptions = [
    { 
      value: "", 
      label: "All Status",
      count: statusFilterCounts.total || 0
    },
    { 
      value: "do_doc_prepared", 
      label: "DO Doc Prepared",
      count: statusFilterCounts.do_doc_prepared || 0
    },
    { 
      value: "do_doc_not_prepared", 
      label: "DO Doc Not Prepared",
      count: statusFilterCounts.do_doc_not_prepared || 0
    },
    { 
      value: "payment_request_sent", 
      label: "Payment Request Sent to Billing Team",
      count: statusFilterCounts.payment_request_sent || 0
    },
    { 
      value: "payment_request_not_sent", 
      label: "Payment Request Not Sent to Billing Team",
      count: statusFilterCounts.payment_request_not_sent || 0
    },
    { 
      value: "payment_made", 
      label: "Payment Made",
      count: statusFilterCounts.payment_made || 0
    },
    { 
      value: "payment_not_made", 
      label: "Payment Not Made",
      count: statusFilterCounts.payment_not_made || 0
    },
    { 
      value: "obl_received", 
      label: "OBL Received",
      count: statusFilterCounts.obl_received || 0
    },
    { 
      value: "obl_not_received", 
      label: "OBL Not Received",
      count: statusFilterCounts.obl_not_received || 0
    },
    { 
      value: "doc_sent_to_shipping_line", 
      label: "Doc Sent to Shipping Line",
      count: statusFilterCounts.doc_sent_to_shipping_line || 0
    },
    { 
      value: "doc_not_sent_to_shipping_line", 
      label: "Doc Not Sent to Shipping Line",
      count: statusFilterCounts.doc_not_sent_to_shipping_line || 0
    }
  ];

  // DO List options
  const doListOptions = [
    { value: "", label: "Select DO List" },
    { value: "ICD Khodiyar / ICD AHMEDABAD", label: "ICD Khodiyar / ICD AHMEDABAD" },
    { value: "ICD SANAND", label: "ICD SANAND" },
    { value: "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK", label: "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK" },
    { value: "ABHI CONTAINER SERVICES", label: "ABHI CONTAINER SERVICES" },
    { value: "Golden Horn Container Services (Nr. ICD Khodiyar)", label: "Golden Horn Container Services (Nr. ICD Khodiyar)" },
    { value: "Golden Horn Container Services (Nr. ICD SANAND)", label: "Golden Horn Container Services (Nr. ICD SANAND)" },
    { value: "JAY BHAVANI CONTAINERS YARD", label: "JAY BHAVANI CONTAINERS YARD" },
    { value: "BALAJI QUEST YARD", label: "BALAJI QUEST YARD" },
    { value: "SATURN GLOBAL TERMINAL PVT LTD", label: "SATURN GLOBAL TERMINAL PVT LTD" },
    { value: "CHEKLA CONTAINER YARD", label: "CHEKLA CONTAINER YARD" }
  ];

 

  // Remove the automatic clearing - we'll handle this from the tab component instead

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
  // Fetch jobs with pagination
const fetchJobs = useCallback(
  async (
    currentPage,
    currentSearchQuery,
    currentYear,
    currentICD,
    selectedImporter,
    statusFilter = ""
  ) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-do-module-jobs`,
        {
          params: {
            page: currentPage,
            limit,
            search: currentSearchQuery,
            year: currentYear,
            selectedICD: currentICD,
            importer: selectedImporter?.trim() || "",
            username: user?.username || "",
            statusFilter: statusFilter || "",
          },
        }
      );

      const {
        totalJobs,
        totalPages,
        currentPage: returnedPage,
        jobs,
        doDocCounts, // Get the new counts
        statusFilterCounts, // Get the status filter counts
      } = res.data;

      setRows(jobs);
      setTotalPages(totalPages);
      setTotalJobs(totalJobs);
      
      // Set the DO Doc counts
      if (doDocCounts) {
        setDoDocCounts(doDocCounts);
      }

      // Set the status filter counts
      if (statusFilterCounts) {
        setStatusFilterCounts(statusFilterCounts);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setRows([]);
      setTotalPages(1);
      setDoDocCounts({ totalJobs: 0, prepared: 0, notPrepared: 0 });
    } finally {
      setLoading(false);
    }
  },
  [limit, user?.username]
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
        selectedImporter,
        selectedStatusFilter
      );
    }
  }, [
      currentPage,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    selectedStatusFilter,
    user?.username,
    fetchJobs,
  ]);
  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
        setCurrentPage(1); // Reset to first page when user types

  };

  // Handle status filter change
  const handleStatusFilterChange = (event) => {
    setSelectedStatusFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };
  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // setPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce delay
    return () => clearTimeout(handler); // Cleanup on unmount
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage); // Update current page
        setCurrentPage(1); // Reset to first page when user types

  };

  // 3. Add display component for the counts (place this where you want to show the counts)
const DoDocCountsDisplay = () => (
<div style={{ 
  display: 'flex', 
  gap: '12px', 
  alignItems: 'center'
}}>
  <div style={{ 
    padding: '8px 16px', 
    backgroundColor: '#e3f2fd', 
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid #1976d2',
    minWidth: '80px'
  }}>
    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
      {doDocCounts.totalJobs}
    </div>
    <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Jobs</div>
  </div>
  
  <div style={{ 
    padding: '8px 16px', 
    backgroundColor: '#e8f5e8', 
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid #2e7d32',
    minWidth: '80px'
  }}>
    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
      {doDocCounts.prepared}
    </div>
    <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>DO Doc Prepared</div>
  </div>
  
  <div style={{ 
    padding: '8px 16px', 
    backgroundColor: '#ffebee', 
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid #d32f2f',
    minWidth: '80px'
  }}>
    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>
      {doDocCounts.notPrepared}
    </div>
    <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>DO Doc Not Prepared</div>
  </div>
</div>


);


  const columns = [


{
  accessorKey: "job_no",
  header: "Job No",
  size: 120,
  Cell: ({ cell }) => {
    const {
      job_no,
      custom_house,
      _id,
      type_of_b_e,
      consignment_type,
      year,
    } = cell.row.original;

    const isSelected = selectedJobId === _id;

    return (
     <Link
  to={`/edit-do-planning/${job_no}/${year}?jobId=${_id}`}
  target="_blank"

        // target="_blank" // open in new tab
        rel="noopener noreferrer"
        onClick={() => setSelectedJobId(_id)} // still highlight in current table
        style={{
          backgroundColor: isSelected ? "#ffffcc" : "transparent",
          textAlign: "center",
          cursor: "pointer",
          color: "blue",
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
        const [isDoDocPrepared, setIsDoDocPrepared] = React.useState(row.original.is_do_doc_prepared || false);

        // Sync local state when row data changes
        React.useEffect(() => {
          setIsDoDocPrepared(row.original.is_do_doc_prepared || false);
        }, [row.original.is_do_doc_prepared]);

        // Remove local state - use the data directly from the row
        // const [checked, setChecked] = React.useState(isDoDocPrepared);

        // Get payment_recipt_date and payment_request_date from do_shipping_line_invoice[0] if present
        const doShippingLineInvoice = row.original.do_shipping_line_invoice;
        let paymentReciptDate = '';
        let paymentRequestDate = '';
        if (Array.isArray(doShippingLineInvoice) && doShippingLineInvoice.length > 0) {
          paymentReciptDate = doShippingLineInvoice[0].payment_recipt_date;
          paymentRequestDate = doShippingLineInvoice[0].payment_request_date;
        }

        const handleToggleDoDocPrepared = async (event) => {
          const newValue = event.target.checked;
          const previousValue = isDoDocPrepared;
          
          // Update local state immediately
          setIsDoDocPrepared(newValue);
          
          // Update the row data directly
          row.original.is_do_doc_prepared = newValue;
          
          try {
            const now = new Date().toISOString();
            const updateData = {
              is_do_doc_prepared: newValue,
              do_doc_prepared_date: now
            };
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const headers = {
              "Content-Type": "application/json",
              "user-id": user.username || "unknown",
              username: user.username || "unknown",
              "user-role": user.role || "unknown",
            };
            await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, updateData, { headers });
            
            // Update the main state
            setRows(prevRows => 
              prevRows.map(r => 
                r._id === _id ? { ...r, is_do_doc_prepared: newValue } : r
              )
            );
          } catch (error) {
            // Revert the changes on error
            setIsDoDocPrepared(previousValue);
            row.original.is_do_doc_prepared = previousValue;
            console.error('Error updating DO doc prepared status:', error);
            
            // Revert the state as well
            setRows(prevRows => 
              prevRows.map(r => 
                r._id === _id ? { ...r, is_do_doc_prepared: previousValue } : r
              )
            );
          }
        };

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
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={isDoDocPrepared}
                onChange={handleToggleDoDocPrepared}
                style={{ marginRight: '6px' }}
              />
              DO Doc Prepared
            </label>
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
    const [isOblReceived, setIsOblReceived] = React.useState(row.original.is_obl_recieved || false);
    const _id = row.original._id;

    // Sync local state when row data changes
    React.useEffect(() => {
      setIsOblReceived(row.original.is_obl_recieved || false);
    }, [row.original.is_obl_recieved]);

    const handleToggleOBL = async (event) => {
      const newValue = event.target.checked;
      const previousValue = isOblReceived;
      
      // Update local state immediately
      setIsOblReceived(newValue);
      
      // Update the row data directly
      row.original.is_obl_recieved = newValue;
      
      try {
        const now = new Date().toISOString();
        const updateData = {
          is_obl_recieved: newValue,
          obl_recieved_date: now
        };
 const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };
        await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, updateData, { headers });
        console.log('OBL status and date updated successfully');
        
        // Update the main state
        setRows(prevRows => 
          prevRows.map(r => 
            r._id === _id ? { ...r, is_obl_recieved: newValue } : r
          )
        );
      } catch (error) {
        console.error('Error updating OBL status:', error);
        // Revert the changes on error
        setIsOblReceived(previousValue);
        row.original.is_obl_recieved = previousValue;
        
        // Revert the state as well
        setRows(prevRows => 
          prevRows.map(r => 
            r._id === _id ? { ...r, is_obl_recieved: previousValue } : r
          )
        );
      }
    };

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

        <div>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={isOblReceived}
              onChange={handleToggleOBL}
              style={{ marginRight: '6px' }}
            />
            OBL Received
          </label>
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
        const typeOfDo = row.original.type_of_Do;
        const [isDoDocRecieved, setIsDoDocRecieved] = React.useState(row.original.is_do_doc_recieved || false);
        const _id = row.original._id;

        // Sync local state when row data changes
        React.useEffect(() => {
          setIsDoDocRecieved(row.original.is_do_doc_recieved || false);
          setSelectedDoList(row.original.do_list || "");
        }, [row.original.is_do_doc_recieved, row.original.do_list]);
        const [selectedDoList, setSelectedDoList] = React.useState(row.original.do_list || "");

        // Sync local state when row data changes
        React.useEffect(() => {
          setSelectedDoList(row.original.do_list || "");
        }, [row.original.do_list]);

        const handleToggleDoDoc = async (event) => {
          const newValue = event.target.checked;
          const previousValue = isDoDocRecieved;
          
          // Update local state immediately
          setIsDoDocRecieved(newValue);
          
          // Update the row data directly
          row.original.is_do_doc_recieved = newValue;
          
          try {
            const now = new Date().toISOString();
            const updateData = {
              is_do_doc_recieved: newValue,
              do_doc_recieved_date: now
            };
           const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };
            await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, updateData, { headers });
            
            // Update the main state
            setRows(prevRows => 
              prevRows.map(r => 
                r._id === _id ? { ...r, is_do_doc_recieved: newValue } : r
              )
            );
          } catch (error) {
            // Revert the changes on error
            setIsDoDocRecieved(previousValue);
            row.original.is_do_doc_recieved = previousValue;
            console.error('Error updating DO doc received status:', error);
            
            // Revert the state as well
            setRows(prevRows => 
              prevRows.map(r => 
                r._id === _id ? { ...r, is_do_doc_recieved: previousValue } : r
              )
            );
          }
        };

        const handleDoListChange = async (event) => {
          const newValue = event.target.value;
          const previousValue = selectedDoList;
          
          // Update local state immediately for UI responsiveness
          setSelectedDoList(newValue);
          
          // Update the row data directly for immediate UI update
          row.original.do_list = newValue;
          
          try {
            const updateData = {
              do_list: newValue
            };
           const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };
            await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, updateData, { headers });
            console.log('DO list updated successfully');
            
            // Force a re-render by updating the rows state
            setRows(prevRows => 
              prevRows.map(r => 
                r._id === _id ? { ...r, do_list: newValue } : r
              )
            );
          } catch (error) {
            // Revert the changes on error
            setSelectedDoList(previousValue);
            row.original.do_list = previousValue;
            console.error('Error updating DO list:', error);
            
            // Revert the state as well
            setRows(prevRows => 
              prevRows.map(r => 
                r._id === _id ? { ...r, do_list: previousValue } : r
              )
            );
          }
        };

        return (
          <div
            style={{
              backgroundColor: dayDifference > 0 ? "#FFCCCC" : "#CCFFCC",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            {displayDate}{" "}
            {dayDifference > 0 && <div>(+{dayDifference} days)</div>}
            <div>Type Of Do: {typeOfDo}</div>
            <div>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={isDoDocRecieved}
              onChange={handleToggleDoDoc}
              style={{ marginRight: '6px' }}
            />
            Do document send to shipping line
          </label>
        </div>
        
        {/* DO List Dropdown */}
        <div style={{ marginTop: '8px' }}>
          <select
            value={selectedDoList}
            onChange={handleDoListChange}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: 'white'
            }}
          >
            {doListOptions.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const {
          processed_be_attachment,
          cth_documents,
          checklist,
        } = cell.row.original;

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
              <span style={{ color: "gray" }}> No Pre-Shipment Inspection Certificate </span>
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
          flexDirection: "column",
          width: "100%",
          gap: "16px",
          padding: "16px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginBottom: "8px",
        }}
      >
        {/* First Row - Header and Counts */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          borderBottom: "1px solid #e0e0e0",
          paddingBottom: "12px"
        }}>
          
          <DoDocCountsDisplay />
        </div>

        {/* Second Row - Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            alignItems: "end",
          }}
        >


          {/* Importer Filter */}
          <Autocomplete
            size="small"
            options={importerNames.map((option) => option.label)}
            value={selectedImporter || ""}
            onInputChange={(event, newValue) => setSelectedImporter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Select Importer"
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  }
                }}
              />
            )}
          />

          {/* Year Filter */}
          <TextField
            select
            size="small"
            value={selectedYearState}
            onChange={(e) => setSelectedYearState(e.target.value)}
            label="Financial Year"
            fullWidth
            sx={{ 
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
              }
            }}
          >
            {years.map((year, index) => (
              <MenuItem key={`year-${year}-${index}`} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>

          {/* ICD Filter */}
          <TextField
            select
            size="small"
            variant="outlined"
            label="ICD Location"
            value={selectedICD}
            onChange={(e) => {
              setSelectedICD(e.target.value);
              setCurrentPage(1);
            }}
            fullWidth
            sx={{ 
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
              }
            }}
          >
            <MenuItem value="">All ICDs</MenuItem>
            <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
            <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
            <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
          </TextField>

          {/* Status Filter */}
          <TextField
            select
            size="small"
            variant="outlined"
            label="Status Filter"
            value={selectedStatusFilter}
            onChange={handleStatusFilterChange}
            fullWidth
            sx={{ 
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
              }
            }}
          >
            {statusFilterOptions.map((option, index) => (
              <MenuItem 
                key={`status-${option.value}-${index}`} 
                value={option.value}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingRight: '16px'
                }}
              >
                <span>{option.label}</span>
               <div
                  style={{
                    // backgroundColor: ' #ec7a80ff',
                    color: '#000000ff',
                    borderRadius: '100px',
                    minWidth: '24px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600',
                    marginLeft: 'auto',
                    border: '2px solid #e41515ff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    letterSpacing: '0.5px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {option.count}
                </div>
              </MenuItem>
            ))}
          </TextField>

                    {/* Search Field - Takes more space */}
          <div style={{ gridColumn: "span 2", minWidth: "300px" }}>
            <TextField
              placeholder="Search by Job No, Importer, AWB/BL Number..."
              size="small"
              variant="outlined"
              fullWidth
              value={searchQuery}
              onChange={handleSearchInputChange}
              label="Search"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        setDebouncedSearchQuery(searchQuery);
                        setCurrentPage(1);
                      }}
                      size="small"
                    >
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                }
              }}
            />
          </div>
        </div>
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
      <MaterialReactTable table={table} />      {/* Pagination */}
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

export default React.memo(DoPlanning);

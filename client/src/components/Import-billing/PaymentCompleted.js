import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Box,
  Typography,
  MenuItem,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Paper,
  Grid,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext.js";
import DocsCell from "../gallery/DocsCell.js";
import { BranchContext } from "../../contexts/BranchContext.js";
import TuneIcon from "@mui/icons-material/Tune";
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventIcon from "@mui/icons-material/Event";
import { Popover } from "@mui/material";

import ContainerTrackButton from '../ContainerTrackButton';
import logo from "../../assets/images/logo.webp";
import { generatePurchaseBookPDF } from "../../utils/purchaseBookPrint.js";

function PaymentCompleted({ workMode = "Payment" }) {
  const { currentTab } = useContext(TabContext); // Access context
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter, currentPageTab0: currentPage, setCurrentPageTab0: setCurrentPage } = useSearchQuery();
  const { user } = useContext(UserContext);
  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const [loading, setLoading] = useState(false); // Loading state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced search query
  const limit = 100; // Number of items per page
  const [totalJobs, setTotalJobs] = useState(0); // Total job count
  const navigate = useNavigate();
  const [importers, setImporters] = useState("");
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [completionStartDate, setCompletionStartDate] = useState("");
  const [completionEndDate, setCompletionEndDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState("single"); // 'single', 'range', 'today', 'week', 'month', 'year'
  const [anchorEl, setAnchorEl] = useState(null);

  const handleAdvancedClick = (event) => setAnchorEl(event.currentTarget);
  const handleAdvancedClose = () => setAnchorEl(null);

  const calculateDates = useCallback(() => {
    const today = new Date();
    let start = "";
    let end = "";

    switch (dateFilterType) {
      case "single":
        if (completionStartDate) {
          start = completionStartDate;
          end = completionStartDate;
        }
        break;
      case "today":
        start = end = today.toISOString().split("T")[0];
        break;
      case "week": {
        const d_start = new Date(today);
        d_start.setDate(today.getDate() - today.getDay());
        const d_end = new Date(d_start);
        d_end.setDate(d_start.getDate() + 6);
        start = d_start.toISOString().split("T")[0];
        end = d_end.toISOString().split("T")[0];
        break;
      }
      case "month": {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
        break;
      }
      case "year":
        start = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
        end = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0];
        break;
      case "range":
        start = completionStartDate;
        end = completionEndDate;
        break;
      default:
        break;
    }
    return { start, end };
  }, [dateFilterType, completionStartDate, completionEndDate]);

  const fetchPaymentRequestDetails = async (requestNo) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-payment-request-details/${encodeURIComponent(requestNo)}`
      );
      setSelectedPaymentRequest(res.data);
    } catch (err) {
      console.error("Error fetching payment request details:", err);
    }
  };

  const handleViewPaymentRequest = async (requestNo) => {
    setIsModalLoading(true);
    setOpenDetailModal(true);
    await fetchPaymentRequestDetails(requestNo);
    setIsModalLoading(false);
  };

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
      selectedYearState,
      username,
      selectedBranch = "all",
      selectedCategory = "all",
      startDate = "",
      endDate = ""
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-payment-completed-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "",
              username: username || "",
              branchId: selectedBranch || "all", // ✅ Add branchId parameter
              category: selectedCategory || "all", // ✅ Add category parameter
              startDate,
              endDate,
              workMode
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
        console.error("Error fetching billing ready jobs:", error);
        setRows([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit, workMode]
  );

  // Fetch jobs when dependencies change
  useEffect(() => {
    if (selectedYearState && user?.username) {
      const { start, end } = calculateDates();
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        user.username,
        selectedBranch,
        selectedCategory,
        start,
        end,
        workMode
      );
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    user?.username,
    fetchJobs,
    selectedBranch,
    selectedCategory,
    calculateDates,
    workMode
  ]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page on new search
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Handle copy functionality
  const handleCopy = useCallback((event, text) => {
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
  }, []);

  const columns = React.useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No", muiTableHeadCellProps: { align: "center" }, muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
        enableSorting: false,
        size: 250,
        Cell: ({ cell }) => {
          const {
            job_no,
            year,
            _id,
            type_of_b_e,
            consignment_type,
            custom_house,
            detailed_status,
            vessel_berthing,
            colorPriority,      // ✅ USE THIS FROM BACKEND
            container_nos,
            branch_code,
            trade_type,
            mode,
            be_no,
            be_date,
            awb_bl_no,
          } = cell.row.original;

          // Color-coding logic based on job status and dates
          // Color-coding logic - NOW USES BACKEND DATA
          let bgColor = "";
          let textColor = "blue";

          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0); // ✅ MUST normalize time

          // Function to calculate the days difference (MUST MATCH BACKEND)
          const calculateDaysDifference = (targetDate) => {
            if (!targetDate) return null;

            const date = new Date(targetDate);
            date.setHours(0, 0, 0, 0); // ✅ CRITICAL: Normalize time

            const timeDifference = date.getTime() - currentDate.getTime();
            return Math.floor(timeDifference / (1000 * 3600 * 24));
          };

          // ✅ OPTION 1: Use backend colorPriority (RECOMMENDED)
          if (colorPriority) {
            if (colorPriority === 1) {
              bgColor = "red";
              textColor = "white";
            } else if (colorPriority === 2) {
              bgColor = "orange";
              textColor = "black";
            } else if (colorPriority === 3) {
              bgColor = "white";
              textColor = "blue";
            }
          }
          // ✅ OPTION 2: Fallback to frontend calculation (with fixed logic)
          else if (detailed_status === "Billing Pending" && container_nos) {
            let mostCriticalDays = null;

            container_nos.forEach((container) => {
              const targetDate = consignment_type === "LCL"
                ? container.delivery_date
                : container.emptyContainerOffLoadDate;

              if (targetDate) {
                const daysDifference = calculateDaysDifference(targetDate);

                if (mostCriticalDays === null || daysDifference < mostCriticalDays) {
                  mostCriticalDays = daysDifference;
                }
              }
            });

            // Apply colors based on the most critical container
            if (mostCriticalDays !== null && mostCriticalDays < 0) {
              if (mostCriticalDays <= -10) {
                bgColor = "red";
                textColor = "white";
              } else if (mostCriticalDays <= -6) {
                bgColor = "orange";
                textColor = "black";
              } else if (mostCriticalDays <= -1) {
                bgColor = "white";
                textColor = "blue";
              }
            }
          }


          const queryParams = new URLSearchParams({
            selectedJobId: _id,
          }).toString();

          return (
            <Link
              to={`/view-payment-request-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?selectedJobId=${_id}`}
              state={{ workMode }}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                cursor: "pointer",
                color: textColor,
                backgroundColor: bgColor || "transparent",
                padding: "10px",
                borderRadius: "5px",
                textAlign: "center",
                textDecoration: "none",
                fontSize: "0.85rem",
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              <div style={{ fontWeight: "700", marginBottom: "4px" }}>
                {cell.row.original.job_number || job_no}
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                {type_of_b_e} | {consignment_type}
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: "2px" }}>
                {custom_house}
              </div>
            </Link>
          );
        },
      },
      {
        accessorKey: "importer_shipping_line",
        header: "Importer & Shipping Line",
        size: 220,
        Cell: ({ cell }) => {
          const { importer, shipping_line_airline } = cell.row.original;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ fontWeight: "bold", color: "#333", fontSize: "0.80rem" }}>
                {importer || "-"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#1976d2", fontWeight: "500" }}>
                Line: {shipping_line_airline || "-"}
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: "be_no",
        header: "BE NO and BL NO",
        enableSorting: false,
        size: 150,
        Cell: ({ cell }) => {
          const { be_no, be_date, awb_bl_no } = cell.row.original;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1a237e", display: "flex", alignItems: "center" }}>
                BE NO: {be_no || "-"}
                {be_no && (
                  <IconButton size="small" onClick={(e) => handleCopy(e, be_no)} sx={{ ml: 0.5, p: 0.2 }}>
                    <ContentCopyIcon sx={{ fontSize: "10px" }} />
                  </IconButton>
                )}
              </div>
              <div style={{ fontSize: "10px", color: "#666" }}>
                 {be_date ? new Date(be_date).toLocaleDateString("en-GB") : "-"}
              </div>
              <div style={{ 
                fontSize: "11px", 
                fontWeight: "bold", 
                color: "#2e7d32", 
                marginTop: "4px",
                padding: "2px 4px",
                backgroundColor: "#e8f5e9",
                borderRadius: "4px",
                width: "fit-content",
                display: "flex",
                alignItems: "center"
              }}>
                BL NO: {awb_bl_no || "-"}
                {awb_bl_no && (
                  <IconButton size="small" onClick={(e) => handleCopy(e, awb_bl_no)} sx={{ ml: 0.5, p: 0.2 }}>
                    <ContentCopyIcon sx={{ fontSize: "10px" }} />
                  </IconButton>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: workMode === "Payment" ? "payment_request_no" : "purchase_book_no",
        header: workMode === "Payment" ? "Payment Request No" : "Purchase Book No",
        size: 450,
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";
          const receiptField = workMode === "Payment" ? "payment_request_receipt_url" : "purchase_book_receipt_url";

          // Group charge heads by request number
          const reqGroups = charges.reduce((acc, c) => {
            if (c[filterField]) {
              if (!acc[c[filterField]]) acc[c[filterField]] = [];
              acc[c[filterField]].push(c.chargeHead);
            }
            return acc;
          }, {});

          const entries = Object.keys(reqGroups);

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {entries.length > 0 ? (
                entries.map((no, idx) => {
                  const uniqueHeads = [...new Set(reqGroups[no])].join(", ");
                  const chargesForThisEntry = charges.filter(c => c[filterField] === no);
                  const isApproved = chargesForThisEntry.some(c => c[isApprovedField]);
                  const receiptUrl = chargesForThisEntry.find(c => c[receiptField])?.[receiptField];

                  return (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: idx < entries.length - 1 ? '1px dashed #eee' : 'none', pb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={no}
                          size="small"
                          onClick={() => handleViewPaymentRequest(no)}
                          color="success"
                          variant="outlined"
                          sx={{ 
                            cursor: "pointer", 
                            fontWeight: 'bold', 
                            height: '20px',
                            '& .MuiChip-label': { px: 1, fontSize: '0.65rem' }
                          }}
                        />
                        {isApproved && (
                          <Chip 
                            label="APPROVED" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.55rem', 
                              height: '16px', 
                              fontWeight: '900',
                              borderColor: '#2e7d32', 
                              color: '#2e7d32',
                              '& .MuiChip-label': { px: 0.5 }
                            }} 
                          />
                        )}
                        {receiptUrl && (
                          <IconButton 
                            size="small" 
                            href={receiptUrl} 
                            target="_blank" 
                            sx={{ p: 0, color: '#2e7d32', ml: 0.5 }}
                            title={workMode === "Payment" ? "View Payment Receipt" : "View Purchase Receipt"}
                          >
                            <OpenInNewIcon sx={{ fontSize: '14px' }} />
                          </IconButton>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#555', fontSize: '0.65rem', lineHeight: 1.2 }}>
                        : {uniqueHeads}
                      </Typography>
                    </Box>
                  );
                })
              ) : (
                "-"
              )}
            </Box>
          );
        }
      },
      {
        accessorKey: workMode === "Payment" ? "transaction_type" : "supplier_name",
        header: workMode === "Payment" ? "Transaction Mode" : "Supplier",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const dataField = workMode === "Payment" ? "payment_request_transaction_type" : "supplier_name";
          
          const reqGroups = charges.reduce((acc, c) => {
            if (c[filterField]) {
              if (!acc[c[filterField]]) acc[c[filterField]] = [];
              acc[c[filterField]].push(c[dataField] || "-");
            }
            return acc;
          }, {});
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.keys(reqGroups).map((no, idx) => (
                <Box key={idx} sx={{ height: '24px', display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#1976d2' }}>
                    {reqGroups[no][0]}
                  </Typography>
                </Box>
              ))}
            </Box>
          );
        }
      },
      {
        accessorKey: workMode === "Payment" ? "requested_by" : "supplier_inv_no",
        header: workMode === "Payment" ? "Requested By" : "Supp Inv No",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const reqByField = workMode === "Payment" ? "payment_request_requested_by" : "purchase_book_requested_by";
          const entries = charges
            .filter(c => c[filterField])
            .reduce((acc, c) => {
              const name = c[reqByField];
              if (name && !acc.find(e => e.name === name)) {
                acc.push({
                  name,
                  date: c.createdAt || c.payment_request_created_at || null
                });
              }
              return acc;
            }, []);
          return entries.length > 0 ? (
            <div style={{ fontSize: '0.75rem', fontWeight: '500' }}>
              {entries.map((entry, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <div>{entry.name}</div>
                  {entry.date && (
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                      {new Date(entry.date).toLocaleString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : "-";
        }
      },
      {
        accessorKey: "completion_date",
        header: "Completion Date",
        size: 250,
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const entries = [...new Set(charges.map(c => c[filterField]).filter(Boolean))];
          
          if (entries.length === 0) return "-";

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {entries.map((no, idx) => {
                // Find all charges for this entry and take the latest date
                const chargesForEntry = charges.filter(c => c[filterField] === no);
                const dates = chargesForEntry
                  .map(c => c.utrAddedAt || c.updatedAt)
                  .filter(Boolean)
                  .sort((a, b) => new Date(b) - new Date(a));
                
                const date = dates.length > 0 ? dates[0] : null;

                return (
                  <Typography key={idx} variant="body2" sx={{ height: '24px', display: 'flex', alignItems: 'center' }}>
                    {date ? new Date(date).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : "-"}
                  </Typography>
                );
              })}
            </Box>
          );
        }
      },
    ],
    [navigate, handleCopy]
  );

  // Table configuration
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
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        textAlign: "left", // Ensure header content aligns left
      },
    },
    muiTableBodyCellProps: {
      sx: {
        textAlign: "left", // Align all body cell content to the left
      },
    },

    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {/* Job Count Display */}
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontSize: "1.5rem", marginRight: "auto" }}
        >
          {workMode === "Payment" ? "Payment Completed" : "Purchase Book Completed"}: {totalJobs}
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

        {/* Completion Date Filter */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1a237e' }}>COMPLETED ON:</Typography>
          <TextField
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={completionStartDate}
            onChange={(e) => {
              setCompletionStartDate(e.target.value);
              setDateFilterType("single");
              setPage(1);
            }}
            sx={{ width: '150px', '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
          />
          
          <Button
            size="small"
            variant="outlined"
            onClick={handleAdvancedClick}
            startIcon={<TuneIcon />}
            sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 'bold' }}
          >
            Advanced
          </Button>

          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleAdvancedClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            PaperProps={{ sx: { p: 2, width: '320px', mt: 1, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' } }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>QUICK FILTERS</Typography>
            <Grid container spacing={1} sx={{ mb: 3 }}>
              {[
                { label: 'Today', type: 'today', icon: <TodayIcon fontSize="small" /> },
                { label: 'Week', type: 'week', icon: <DateRangeIcon fontSize="small" /> },
                { label: 'Month', type: 'month', icon: <CalendarMonthIcon fontSize="small" /> },
                { label: 'Year', type: 'year', icon: <EventIcon fontSize="small" /> }
              ].map((preset) => (
                <Grid item xs={6} key={preset.type}>
                  <Button
                    fullWidth
                    size="small"
                    variant={dateFilterType === preset.type ? "contained" : "outlined"}
                    startIcon={preset.icon}
                    onClick={() => {
                      setDateFilterType(preset.type);
                      setCompletionStartDate("");
                      setCompletionEndDate("");
                      setPage(1);
                      handleAdvancedClose();
                    }}
                    sx={{ borderRadius: '10px', textTransform: 'none' }}
                  >
                    {preset.label}
                  </Button>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>CUSTOM RANGE</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                type="date"
                size="small"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={completionStartDate}
                onChange={(e) => {
                  setCompletionStartDate(e.target.value);
                  setDateFilterType("range");
                  setPage(1);
                }}
              />
              <TextField
                type="date"
                size="small"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={completionEndDate}
                onChange={(e) => {
                  setCompletionEndDate(e.target.value);
                  setDateFilterType("range");
                  setPage(1);
                }}
              />
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                size="small" 
                color="error" 
                onClick={() => {
                  setCompletionStartDate("");
                  setCompletionEndDate("");
                  setDateFilterType("single");
                  setPage(1);
                  handleAdvancedClose();
                }}
              >
                Clear All
              </Button>
            </Box>
          </Popover>

          {dateFilterType !== "single" && (
            <Chip 
              label={dateFilterType.toUpperCase()} 
              size="small" 
              color="primary" 
              onDelete={() => {
                setDateFilterType("single");
                setPage(1);
              }}
              sx={{ borderRadius: '5px', fontWeight: 'bold' }}
            />
          )}
        </Box>
      </div>
    ),
  };

  return (
    <div style={{ height: "80%" }}>
      <>
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
      </>

      <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0, border: '2px solid #2e7d32' } }}>
        <DialogTitle sx={{ backgroundColor: '#2e7d32', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 2, fontSize: '1rem' }}>
          <span>{selectedPaymentRequest?.isPurchaseBook ? "PURCHASE BOOK DETAILS" : "PAYMENT COMPLETED DETAILS"}</span>
          <Chip label={selectedPaymentRequest?.isPurchaseBook ? "PURCHASE ENTRY" : "COMPLETED"} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} />
        </DialogTitle>
        <DialogContent sx={{ p: 0, backgroundColor: '#fff' }}>
          {isModalLoading ? <Box display="flex" justifyContent="center" p={4}><CircularProgress size={40} /></Box> : selectedPaymentRequest && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ border: '1px solid #ccc', mb: 2 }}>
                <Grid container>
                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">
                      {selectedPaymentRequest.isPurchaseBook ? "Entry Date" : "Request Date"}
                    </Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2">
                      {selectedPaymentRequest.requestDate || (selectedPaymentRequest.date || selectedPaymentRequest.createdAt ? new Date(selectedPaymentRequest.date || selectedPaymentRequest.createdAt).toLocaleDateString('en-GB') : "N/A")}
                    </Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">
                      {selectedPaymentRequest.isPurchaseBook ? "Entry No" : "Request No"}
                    </Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.requestNo}</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Importer</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2">{selectedPaymentRequest.importer}</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">
                      {selectedPaymentRequest.isPurchaseBook ? "Supplier Name" : "Beneficiary"}
                    </Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2" color="primary" fontWeight="bold">{selectedPaymentRequest.paymentTo || "N/A"}</Typography>
                  </Grid>

                  {selectedPaymentRequest.isPurchaseBook ? (
                    <>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Supplier Address</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>
                          {selectedPaymentRequest.supplierAddr1} {selectedPaymentRequest.supplierAddr2} {selectedPaymentRequest.supplierAddr3}
                          <br />
                          {selectedPaymentRequest.supplierState}, {selectedPaymentRequest.supplierCountry} - {selectedPaymentRequest.supplierPin}
                        </Typography>
                      </Grid>

                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">GSTIN & PAN</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          GSTIN: {selectedPaymentRequest.gstinNo || "-"} | PAN: {selectedPaymentRequest.panNo || "-"}
                        </Typography>
                      </Grid>

                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Supplier Inv No & Date</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.supplierInvNo || "-"} / {selectedPaymentRequest.supplierInvDate || "-"}</Typography>
                      </Grid>

                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Description of Services</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{selectedPaymentRequest.descriptionOfServices || "N/A"}</Typography>
                      </Grid>

                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">SAC / HSN</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2">{selectedPaymentRequest.sac || "N/A"}</Typography>
                      </Grid>

                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Taxable Value</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">₹ {selectedPaymentRequest.taxableValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}</Typography>
                      </Grid>

                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">GST Details ({selectedPaymentRequest.gstPercent}%)</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          CGST: {selectedPaymentRequest.cgstAmt?.toLocaleString('en-IN') || 0} | 
                          SGST: {selectedPaymentRequest.sgstAmt?.toLocaleString('en-IN') || 0} | 
                          IGST: {selectedPaymentRequest.igstAmt?.toLocaleString('en-IN') || 0}
                        </Typography>
                      </Grid>

                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">TDS Deduction</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2" color="error">₹ -{selectedPaymentRequest.tdsAmt?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}</Typography>
                      </Grid>
                    </>
                  ) : (
                    <>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Bank Name</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2">{selectedPaymentRequest.bankName || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Account No</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedPaymentRequest.accountNo || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">IFSC Code</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2">{selectedPaymentRequest.ifscCode || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Transaction Type</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2">{selectedPaymentRequest.transactionType || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Transfer Mode</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2">{selectedPaymentRequest.transferMode || "N/A"}</Typography>
                      </Grid>
                    </>
                  )}

                  {selectedPaymentRequest.transactionType === 'CHEQUE' && (
                    <>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Instrument No</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2">{selectedPaymentRequest.instrumentNo || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                        <Typography variant="caption" fontWeight="bold">Instrument Date</Typography>
                      </Grid>
                      <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                        <Typography variant="body2">{selectedPaymentRequest.instrumentDate || "N/A"}</Typography>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">{selectedPaymentRequest.isPurchaseBook ? "Total Payable" : "Amount"}</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="h6" color="error" fontWeight="bold">₹ {selectedPaymentRequest.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">{selectedPaymentRequest.isPurchaseBook ? "Entry By" : "Requested By"}</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.requestedBy || "N/A"}</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Against Bill</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2">{selectedPaymentRequest.againstBill || "-"}</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Approved By</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2">{selectedPaymentRequest.approvedByFirst} {selectedPaymentRequest.approvedByLast} ({new Date(selectedPaymentRequest.approvedAt).toLocaleDateString('en-GB') || "N/A"})</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Bank From</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.bankFrom || "N/A"}</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">UTR Number</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2" fontWeight="bold" color="success.main">{selectedPaymentRequest.utrNumber}</Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Paid By</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ p: 1 }}>
                    <Typography variant="body2">{selectedPaymentRequest.utrAddedBy || "System"} ({selectedPaymentRequest.utrAddedAt ? new Date(selectedPaymentRequest.utrAddedAt).toLocaleDateString('en-GB') : "N/A"})</Typography>
                  </Grid>
                </Grid>
              </Box>

              {selectedPaymentRequest.attachments?.length > 0 && (
                <Box sx={{ mb: 1.5, p: 1, border: '1px solid #bbdefb', backgroundColor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight="bold" color="primary" sx={{ display: 'block', mb: 1 }}>CHARGE ATTACHMENTS</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedPaymentRequest.attachments.map((url, idx) => (
                      <Button key={idx} variant="outlined" size="small" startIcon={<AttachFileIcon />} href={url} target="_blank" sx={{ textTransform: 'none', py: 0, fontSize: '0.7rem' }}>View {idx + 1}</Button>
                    ))}
                  </Box>
                </Box>
              )}

              {selectedPaymentRequest.paymentReceiptUrl && (
                <Box sx={{ mb: 1.5, p: 1.5, border: '1px solid #2e7d32', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                  <Typography variant="caption" fontWeight="bold" color="success.main" sx={{ display: 'block', mb: 1 }}>PAYMENT RECEIPT</Typography>
                  <Button 
                    variant="contained" 
                    color="success" 
                    size="small" 
                    fullWidth
                    startIcon={<OpenInNewIcon />} 
                    href={selectedPaymentRequest.paymentReceiptUrl} 
                    target="_blank" 
                    sx={{ textTransform: 'none', py: 1, fontSize: '0.85rem', fontWeight: 'bold' }}
                  >
                    View Official Payment Receipt
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1, borderTop: '1px solid #ccc' }}>
          <Button 
            onClick={() => {
              generatePurchaseBookPDF(selectedPaymentRequest, logo);
            }} 
            size="small" 
            variant="outlined"
          >
            Print
          </Button>
          <Button onClick={() => setOpenDetailModal(false)} size="small" variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default PaymentCompleted;

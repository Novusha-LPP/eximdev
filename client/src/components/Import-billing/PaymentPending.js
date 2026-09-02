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
  Button,
  Box,
  Typography,
  MenuItem,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  CircularProgress,
  Divider,
  Grid,
  Popover
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TuneIcon from "@mui/icons-material/Tune";
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventIcon from "@mui/icons-material/Event";
import { generatePurchaseBookPDF } from "../../utils/purchaseBookPrint.js";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext.js";
import { BranchContext } from "../../contexts/BranchContext.js";

import ContainerTrackButton from '../ContainerTrackButton';
import logo from "../../assets/images/logo.webp";

function PaymentPending({ workMode = "Payment" }) {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);

  const [searchQuery, setSearchQuery] = useState(
    () => sessionStorage.getItem("ib_tab4_search") || ""
  );
  const [selectedImporter, setSelectedImporter] = useState(
    () => sessionStorage.getItem("ib_tab4_importer") || ""
  );
  const [selectedRequestDate, setSelectedRequestDate] = useState(
    () => sessionStorage.getItem("ib_tab4_requestDate") !== null
      ? sessionStorage.getItem("ib_tab4_requestDate")
      : new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0]
  );
  const [selectedTransactionType, setSelectedTransactionType] = useState(
    () => sessionStorage.getItem("ib_tab4_txType") || "All"
  );
  const [dateFilterType, setDateFilterType] = useState(
    () => sessionStorage.getItem("ib_tab4_dateFilterType") || "single"
  );
  const [startDate, setStartDate] = useState(
    () => sessionStorage.getItem("ib_tab4_startDate") || ""
  );
  const [endDate, setEndDate] = useState(
    () => sessionStorage.getItem("ib_tab4_endDate") || ""
  );
  const [page, setPage] = useState(
    () => Number(sessionStorage.getItem("ib_tab4_page")) || 1
  );

  const { user } = useContext(UserContext);
  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const limit = 100;
  const [totalJobs, setTotalJobs] = useState(0);
  const navigate = useNavigate();
  const [importers, setImporters] = useState("");
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [utrInput, setUtrInput] = useState("");
  const [bankFromInput, setBankFromInput] = useState("");
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");

  // Persist filter states to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("ib_tab4_search", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab4_importer", selectedImporter || "");
  }, [selectedImporter]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab4_requestDate", selectedRequestDate || "");
  }, [selectedRequestDate]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab4_txType", selectedTransactionType || "All");
  }, [selectedTransactionType]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab4_dateFilterType", dateFilterType);
  }, [dateFilterType]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab4_startDate", startDate || "");
  }, [startDate]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab4_endDate", endDate || "");
  }, [endDate]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab4_page", page.toString());
  }, [page]);

  // New States for Rejection (Restored)
  const [openRejectPopup, setOpenRejectPopup] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);

  const handleAdvancedClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAdvancedClose = () => {
    setAnchorEl(null);
  };

  const calculateDates = useCallback(() => {
    const today = new Date();
    let start = "";
    let end = "";

    switch (dateFilterType) {
      case "single":
        if (startDate) {
          start = startDate;
          end = startDate;
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
        start = startDate;
        end = endDate;
        break;
      default:
        break;
    }
    return { start, end };
  }, [dateFilterType, startDate, endDate]);

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
    setReceiptUrl("");
    setSelectedReceipt(null);
    await fetchPaymentRequestDetails(requestNo);
    setIsModalLoading(false);
  };

  const handleReceiptUpload = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("files", file);
    formData.append("bucketPath", "payment-receipts");

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.urls && res.data.urls.length > 0) {
        return res.data.urls[0];
      }
      return "";
    } catch (err) {
      console.error("Error uploading receipt:", err);
      alert("Failed to upload receipt file.");
      return "";
    }
  };

  const handleUpdateUTR = async () => {
    if (!utrInput.trim() || !bankFromInput) {
      alert("Please enter both UTR Number and Bank From.");
      return;
    }
    setIsSubmittingUtr(true);
    try {
      let finalReceiptUrl = receiptUrl;
      if (selectedReceipt) {
        setIsUploadingReceipt(true);
        finalReceiptUrl = await handleReceiptUpload(selectedReceipt);
        setIsUploadingReceipt(false);
      }

      const endpoint = workMode === "Purchase Book" ? "update-purchase-utr" : "update-payment-utr";
      const displayName = user ? `${user.first_name} ${user.last_name}` : (localStorage.getItem("username") || "Unknown");

      await axios.patch(`${process.env.REACT_APP_API_STRING}/${endpoint}`, {
        requestNo: selectedPaymentRequest.requestNo,
        utrNumber: utrInput,
        bankFrom: bankFromInput,
        paymentReceiptUrl: finalReceiptUrl
      }, {
        headers: { username: displayName }
      });

      setUtrInput("");
      setBankFromInput("");
      setReceiptUrl("");
      setSelectedReceipt(null);
      setOpenDetailModal(false);
      // Refresh main table
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        user?.username,
        selectedBranch,
        selectedCategory,
        selectedRequestDate
      );
    } catch (err) {
      console.error("Error updating UTR:", err);
      alert("Failed to update UTR. Please try again.");
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    if (!user?.first_name || !user?.last_name) {
      alert("User information not found. Please re-login.");
      return;
    }

    const endpoint = workMode === "Purchase Book" ? "reject-purchase-entry" : "reject-payment-request";

    setIsRejecting(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_STRING}/${endpoint}`, {
        requestNo: selectedPaymentRequest.requestNo,
        firstName: user.first_name,
        lastName: user.last_name,
        reason: rejectionReason
      });

      setOpenRejectPopup(false);
      setOpenDetailModal(false);
      setRejectionReason("");
      // Refresh main table
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        user?.username,
        selectedBranch,
        selectedCategory,
        selectedRequestDate
      );
    } catch (err) {
      console.error("Error rejecting payment request:", err);
      alert("Failed to reject payment request.");
    } finally {
      setIsRejecting(false);
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
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-years`);
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, []);

  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedImporter,
      selectedYearState,
      username,
      selectedBranch = "all",
      selectedCategory = "all",
      requestDate = "",
      transactionType = "All",
      startDate = "",
      endDate = ""
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-approved-payment-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "",
              username: username || "",
              branchId: selectedBranch || "all",
              category: selectedCategory || "all",
              requestDate,
              transactionType,
              startDate,
              endDate,
              workMode
            },
          }
        );

        const { totalJobs, totalPages, jobs } = res.data;
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
    [limit, user?.username, workMode]
  );

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
        selectedRequestDate,
        selectedTransactionType,
        start,
        end
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
    selectedRequestDate,
    selectedTransactionType,
    calculateDates,
    workMode
  ]);

  const isFirstSearch = React.useRef(true);
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => setPage(newPage);
  const handleSearchInputChange = (event) => setSearchQuery(event.target.value);

  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text).catch(err => console.error("Failed to copy:", err));
  }, []);

  const columns = React.useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No", muiTableHeadCellProps: { align: "center" }, muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
        Cell: ({ cell }) => {
          const { job_no, year, _id, type_of_b_e, consignment_type, custom_house, branch_code, trade_type, mode } = cell.row.original;
          return (
            <Link
              to={`/view-payment-request-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?selectedJobId=${_id}`}
              state={{ workMode }}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "10px", textAlign: "center", textDecoration: "none", color: 'blue' }}
            >
              {cell.row.original.job_number || job_no}{" "}
              <IconButton
                size="small"
                onClick={(event) => {
                  event.preventDefault();
                  handleCopy(event, cell.row.original.job_number || job_no);
                }}
                style={{ color: "inherit" }}
              >
                <ContentCopyIcon fontSize="inherit" />
              </IconButton>
              <br /> {type_of_b_e} <br /> {consignment_type} <br /> {custom_house}
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
              <div style={{ fontWeight: "bold", color: "#333", fontSize: "0.8rem" }}>
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
        Cell: ({ cell }) => {
          const { be_no, be_date, awb_bl_no, hawb_hbl_no, mbl_details, hbl_details, charges, ie_code_no } = cell.row.original;
          const mblList = Array.isArray(mbl_details) && mbl_details.length > 0
            ? mbl_details.map(m => (typeof m === 'object' ? m?.mbl_no : m)).filter(Boolean)
            : (awb_bl_no ? [awb_bl_no] : []);
          const hblList = Array.isArray(hbl_details) && hbl_details.length > 0
            ? hbl_details.map(h => (typeof h === 'object' ? h?.hbl_no : h)).filter(Boolean)
            : (hawb_hbl_no ? [hawb_hbl_no] : []);
          const hasCustomsDuty = charges && charges.some(c => 
            c.chargeHead && (
              c.chargeHead.toUpperCase() === "CUSTOMS DUTY" || 
              c.chargeHead.toUpperCase() === "CUSTOM DUTY" ||
              c.chargeHead.toUpperCase().includes("CUSTOMS DUTY")
            )
          );
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
                BL NO: {mblList.join(", ") || "-"}
                {mblList[0] && (
                  <IconButton size="small" onClick={(e) => handleCopy(e, mblList.join(", "))} sx={{ ml: 0.5, p: 0.2 }}>
                    <ContentCopyIcon sx={{ fontSize: "10px" }} />
                  </IconButton>
                )}
              </div>
              {hblList.length > 0 && (
                <div style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#1565c0",
                  marginTop: "2px",
                  padding: "2px 4px",
                  backgroundColor: "#e3f2fd",
                  borderRadius: "4px",
                  width: "fit-content",
                  display: "flex",
                  alignItems: "center"
                }}>
                  HBL NO: {hblList.join(", ")}
                  <IconButton size="small" onClick={(e) => handleCopy(e, hblList.join(", "))} sx={{ ml: 0.5, p: 0.2 }}>
                    <ContentCopyIcon sx={{ fontSize: "10px" }} />
                  </IconButton>
                </div>
              )}
              {hasCustomsDuty && (
                <div style={{ 
                  fontSize: "11px", 
                  fontWeight: "bold", 
                  color: "#d32f2f", 
                  marginTop: "4px",
                  padding: "2px 4px",
                  backgroundColor: "#ffebee",
                  borderRadius: "4px",
                  width: "fit-content",
                  display: "flex",
                  alignItems: "center"
                }}>
                  IE CODE: {ie_code_no || "-"}
                  {ie_code_no && (
                    <IconButton size="small" onClick={(e) => handleCopy(e, ie_code_no)} sx={{ ml: 0.5, p: 0.2 }}>
                      <ContentCopyIcon sx={{ fontSize: "10px" }} />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: workMode === "Payment" ? "payment_request_nos" : "purchase_book_nos",
        header: workMode === "Payment" ? "Payment Request No" : "Purchase Book No",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";
          const statusField = workMode === "Payment" ? "payment_request_status" : "purchase_book_status";

          const reqGroups = charges.reduce((acc, c) => {
            if (c[filterField] && c[statusField] !== "Paid" && c[isApprovedField]) {
              if (!acc[c[filterField]]) {
                acc[c[filterField]] = { heads: [], isApproved: false };
              }
              acc[c[filterField]].heads.push(c.chargeHead);
              if (c[isApprovedField]) acc[c[filterField]].isApproved = true;
            }
            return acc;
          }, {});
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.keys(reqGroups).map((no, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>{reqGroups[no].heads.join(", ")}:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label={no} size="small" color="primary" variant="outlined" onClick={() => handleViewPaymentRequest(no)} sx={{ fontWeight: 'bold', height: '20px' }} />
                    <IconButton size="small" onClick={(e) => handleCopy(e, no)} title="Copy No" sx={{ p: 0.2 }}>
                      <ContentCopyIcon sx={{ fontSize: '0.9rem' }} />
                    </IconButton>
                    {reqGroups[no].isApproved && (
                      <Chip label="APPROVED" size="small" color="success" variant="outlined" sx={{ fontSize: '0.55rem', height: '16px', fontWeight: '900', color: '#2e7d32', borderColor: '#2e7d32' }} />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          );
        },
      },
      {
        accessorKey: workMode === "Payment" ? "transaction_type" : "supplier_name",
        header: workMode === "Payment" ? "Transaction Mode" : "Supplier",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const dataField = workMode === "Payment" ? "payment_request_transaction_type" : "supplier_name";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";
          const statusField = workMode === "Payment" ? "payment_request_status" : "purchase_book_status";

          const reqGroups = charges.reduce((acc, c) => {
            if (c[filterField] && c[statusField] !== "Paid" && c[isApprovedField]) {
              if (!acc[c[filterField]]) acc[c[filterField]] = [];
              acc[c[filterField]].push(c[dataField] || "-");
            }
            return acc;
          }, {});
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.keys(reqGroups).map((no, idx) => (
                <Box key={idx} sx={{ height: '36px', display: 'flex', alignItems: 'center' }}>
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
        header: workMode === "Payment" ? "Requested By" : "Supplier Inv No",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const dataField = workMode === "Payment" ? "payment_request_requested_by" : "supplier_inv_no";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";
          const statusField = workMode === "Payment" ? "payment_request_status" : "purchase_book_status";

          const entries = charges
            .filter(c => c[filterField] && c[statusField] !== "Paid" && c[isApprovedField])
            .reduce((acc, c) => {
              const name = c[dataField];
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
    ],
    [handleCopy, workMode]
  );

  const tableConfig = {
    columns,
    data: rows,
    enablePagination: false,
    enableBottomToolbar: false,
    muiTableContainerProps: { sx: { maxHeight: "650px" } },
    renderTopToolbarCustomActions: () => (
      <div style={{ display: "flex", alignItems: "center", width: "100%", padding: '10px', gap: '20px' }}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>{workMode === "Payment" ? "Payment Approved" : "Purchase Book Approved"}: {totalJobs}</Typography>
        <Autocomplete sx={{ width: "300px" }} options={importerNames.map(o => o.label)} value={selectedImporter || ""} onInputChange={(e, v) => { setSelectedImporter(v); setPage(1); }} renderInput={(params) => <TextField {...params} size="small" label="Select Importer" />} />
        <TextField select size="small" value={selectedYearState} onChange={(e) => setSelectedYearState(e.target.value)} sx={{ width: "150px" }}>{years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
        {/* Date Filter */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1a237e' }}>DATE:</Typography>
          <TextField
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={startDate || selectedRequestDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setSelectedRequestDate("");
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
                      setStartDate("");
                      setEndDate("");
                      setSelectedRequestDate("");
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
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedRequestDate("");
                  setDateFilterType("range");
                  setPage(1);
                }}
              />
              <TextField
                type="date"
                size="small"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedRequestDate("");
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
                  setStartDate("");
                  setEndDate("");
                  setSelectedRequestDate("");
                  setDateFilterType("single");
                  setPage(1);
                  handleAdvancedClose();
                }}
              >
                Clear All
              </Button>
            </Box>
          </Popover>
        </Box>

        <TextField 
          select 
          size="small" 
          label="Transaction Type" 
          value={selectedTransactionType} 
          onChange={(e) => {
            setSelectedTransactionType(e.target.value);
            setPage(1);
          }} 
          sx={{ width: "180px" }}
        >
          {["All", "NEFT", "CHEQUE", "CASH", "IMPS", "RTGS", "ONLINE", "DEMAND DRAFT", "ODEX"].map(type => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </TextField>

        <TextField placeholder="Search..." size="small" value={searchQuery} onChange={handleSearchInputChange} sx={{ width: "300px" }} />
      </div>
    ),
  };

  return (
    <div style={{ height: "100%", padding: '20px' }}>
      <MaterialReactTable {...tableConfig} />
      <Box display="flex" justifyContent="center" mt={2}><Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" /></Box>

      <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0, border: `2px solid ${selectedPaymentRequest?.isApproved ? '#2e7d32' : '#9e9e9e'}` } }}>
        <DialogTitle sx={{ backgroundColor: selectedPaymentRequest?.isPurchaseBook ? '#1565c0' : (selectedPaymentRequest?.isApproved ? '#2e7d32' : '#757575'), color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 2, fontSize: '1rem' }}>
          <span>{selectedPaymentRequest?.isPurchaseBook ? "PURCHASE BOOK DETAILS" : "PAYMENT APPROVAL & UTR ENTRY"}</span>
          <Chip
            label={selectedPaymentRequest?.isPurchaseBook ? "PURCHASE ENTRY" : (selectedPaymentRequest?.isApproved ? "APPROVED" : "AWAITING APPROVAL")}
            size="small"
            sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 0, backgroundColor: '#fff' }}>
          {isModalLoading ? <Box display="flex" justifyContent="center" p={4}><CircularProgress size={40} /></Box> : selectedPaymentRequest && (
            <Box sx={{ p: 2 }}>
              {/* Approval Info Section */}
              {selectedPaymentRequest.isPurchaseBook ? (
                <Box sx={{ mb: 2, p: 1, backgroundColor: '#e3f2fd', border: '1px solid #90caf9', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0d47a1' }}>
                    Record type: Purchase Book Entry (Tally Integrated)
                  </Typography>
                </Box>
              ) : selectedPaymentRequest.isApproved ? (
                <Box sx={{ mb: 2, p: 1, backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9', display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="success.main" display="block">Approved By</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.approvedByFirst} {selectedPaymentRequest.approvedByLast}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" fontWeight="bold" color="success.main" display="block">Approved On</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.approvedAt ? new Date(selectedPaymentRequest.approvedAt).toLocaleString('en-GB') : "-"}</Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ mb: 2, p: 1, backgroundColor: '#fff3e0', border: '1px solid #ffe0b2', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#e65100' }}>
                    ⚠️ This request is pending approval. UTR entry is disabled.
                  </Typography>
                </Box>
              )}

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
                    <Typography variant="caption" fontWeight="bold">Payment Request No</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.paymentRequestNo || "-"}</Typography>
                    {selectedPaymentRequest.paymentRequestNo && (
                      <IconButton size="small" onClick={(e) => handleCopy(e, selectedPaymentRequest.paymentRequestNo)} title="Copy PR No">
                        <ContentCopyIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    )}
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Purchase Book No</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.purchaseBookNo || "-"}</Typography>
                    {selectedPaymentRequest.purchaseBookNo && (
                      <IconButton size="small" onClick={(e) => handleCopy(e, selectedPaymentRequest.purchaseBookNo)} title="Copy PB No">
                        <ContentCopyIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    )}
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
                        <Typography variant="body2" color="error">₹ -{selectedPaymentRequest.tds?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}</Typography>
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

                  {['CHEQUE', 'DEMAND DRAFT'].includes(selectedPaymentRequest.transactionType) && (
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

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Against Bill</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ p: 1 }}>
                    <Typography variant="body2">{selectedPaymentRequest.againstBill || "-"}</Typography>
                  </Grid>
                </Grid>
              </Box>

              {selectedPaymentRequest.attachments?.length > 0 && (
                <Box sx={{ mb: 1.5, p: 1, border: '1px solid #bbdefb', backgroundColor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight="bold" color="primary" sx={{ display: 'block', mb: 1 }}>ATTACHMENTS</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedPaymentRequest.attachments.map((url, idx) => (
                      <Button key={idx} variant="outlined" size="small" startIcon={<AttachFileIcon />} href={url} target="_blank" sx={{ textTransform: 'none', py: 0, fontSize: '0.7rem' }}>View {idx + 1}</Button>
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ p: 1.5, border: '1px solid #1976d2', backgroundColor: '#f0f7ff' }}>
                <Typography variant="caption" color="primary" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                  {selectedPaymentRequest?.isPurchaseBook ? "PURCHASE COMPLETION" : "UTR ENTRY"}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, opacity: selectedPaymentRequest.isApproved ? 1 : 0.6 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      select
                      sx={{ minWidth: '160px' }}
                      size="small"
                      label="Bank From"
                      required
                      disabled={!selectedPaymentRequest.isApproved}
                      value={bankFromInput}
                      onChange={(e) => setBankFromInput(e.target.value)}
                    >
                      <MenuItem value="HDFC BANK">HDFC BANK</MenuItem>
                      <MenuItem value="ICICI BANK">ICICI BANK</MenuItem>
                      <MenuItem value="SBI BANK">SBI BANK</MenuItem>
                      <MenuItem value="KOTAK BANK">KOTAK BANK</MenuItem>
                      <MenuItem value="IDBI BANK">IDBI BANK</MenuItem>
                      <MenuItem value="SOUTH INDIAN BANK">SOUTH INDIAN BANK</MenuItem>
                      <MenuItem value="AXIS BANK">AXIS BANK</MenuItem>
                      <MenuItem value="ODEX VAN">ODEX VAN</MenuItem>
                      <MenuItem value="CASH">CASH</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      size="small"
                      label="Enter UTR Number"
                      variant="outlined"
                      required
                      disabled={!selectedPaymentRequest.isApproved}
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      size="small"
                      startIcon={<AttachFileIcon />}
                      disabled={!selectedPaymentRequest.isApproved}
                      sx={{ textTransform: 'none' }}
                    >
                      {selectedReceipt ? "Change Receipt" : "Attach Receipt (Optional)"}
                      <input
                        type="file"
                        hidden
                        disabled={!selectedPaymentRequest.isApproved}
                        onChange={(e) => setSelectedReceipt(e.target.files[0])}
                      />
                    </Button>
                    {selectedReceipt && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedReceipt.name}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={handleUpdateUTR}
                      disabled={!selectedPaymentRequest.isApproved || !utrInput.trim() || !bankFromInput || isSubmittingUtr || isUploadingReceipt}
                      sx={{ flexGrow: 1, fontWeight: 'bold' }}
                    >
                      {isSubmittingUtr || isUploadingReceipt ? <CircularProgress size={20} color="inherit" /> : (selectedPaymentRequest.isPurchaseBook ? "Mark as Entry Completed" : "Save UTR & Mark Paid")}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => setOpenRejectPopup(true)}
                      sx={{ fontWeight: 'bold' }}
                    >
                      Reject Request
                    </Button>
                  </Box>
                </Box>
              </Box>

            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1, borderTop: '1px solid #ccc', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => {
                generatePurchaseBookPDF(selectedPaymentRequest, logo);
              }}
              size="small"
              variant="outlined"
            >
              Print
            </Button>
            <Button onClick={() => setOpenDetailModal(false)} size="small" variant="outlined">Close</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={openRejectPopup} onClose={() => !isRejecting && setOpenRejectPopup(false)} PaperProps={{ sx: { borderRadius: 0, width: '450px', border: '2px solid #d32f2f' } }}>
        <DialogTitle sx={{ backgroundColor: '#d32f2f', color: 'white', fontWeight: 'bold', py: 1.5 }}>REJECT PAYMENT REQUEST</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>Please provide a reason for rejecting this request:</Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            size="small"
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 1, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setOpenRejectPopup(false)} size="small" disabled={isRejecting}>Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error" size="small" disabled={isRejecting}>
            {isRejecting ? <CircularProgress size={20} color="inherit" /> : "Confirm Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default PaymentPending;

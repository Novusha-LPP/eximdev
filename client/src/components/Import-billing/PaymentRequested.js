import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Button,
  Box,
  Badge,
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
  Checkbox,
  FormControlLabel,
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

function PaymentRequested({ workMode = "Payment" }) {
  const { currentTab } = useContext(TabContext);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);

  const [searchQuery, setSearchQuery] = useState(
    () => sessionStorage.getItem("ib_tab3_search") || ""
  );
  const [selectedImporter, setSelectedImporter] = useState(
    () => sessionStorage.getItem("ib_tab3_importer") || ""
  );
  const [selectedTransactionType, setSelectedTransactionType] = useState(
    () => sessionStorage.getItem("ib_tab3_txType") || "All"
  );
  const [dateFilterType, setDateFilterType] = useState(
    () => sessionStorage.getItem("ib_tab3_dateFilterType") || "single"
  );
  const [startDate, setStartDate] = useState(
    () => sessionStorage.getItem("ib_tab3_startDate") || ""
  );
  const [endDate, setEndDate] = useState(
    () => sessionStorage.getItem("ib_tab3_endDate") || ""
  );
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(
    () => sessionStorage.getItem("ib_tab3_unresolved") === "true"
  );
  const [page, setPage] = useState(
    () => Number(sessionStorage.getItem("ib_tab3_page")) || 1
  );

  const [unresolvedCount, setUnresolvedCount] = useState(0);
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
  const [importers, setImporters] = useState([]);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Persist filter states to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("ib_tab3_search", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab3_importer", selectedImporter || "");
  }, [selectedImporter]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab3_txType", selectedTransactionType || "All");
  }, [selectedTransactionType]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab3_dateFilterType", dateFilterType);
  }, [dateFilterType]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab3_startDate", startDate || "");
  }, [startDate]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab3_endDate", endDate || "");
  }, [endDate]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab3_unresolved", showUnresolvedOnly.toString());
  }, [showUnresolvedOnly]);

  useEffect(() => {
    sessionStorage.setItem("ib_tab3_page", page.toString());
  }, [page]);

  // New States for Approval Workflow
  const [openApprovalPopup, setOpenApprovalPopup] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [openRejectPopup, setOpenRejectPopup] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const { start, end } = calculateDates();
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-payment-requested-jobs`,
        {
          params: {
            page: 1,
            limit: 100000,
            search: debouncedSearchQuery,
            importer: selectedImporter?.trim() || "",
            year: selectedYearState || "",
            username: user?.username || "",
            unresolvedOnly: showUnresolvedOnly.toString(),
            branchId: selectedBranch || "all",
            category: selectedCategory || "all",
            transactionType: selectedTransactionType || "All",
            startDate: start,
            endDate: end,
            workMode,
          },
        }
      );

      const allJobs = res.data.jobs || [];
      const excelData = [];
      const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
      const dataFieldMode = workMode === "Payment" ? "payment_request_transaction_type" : "supplier_name";

      const uniquePRs = new Set();
      allJobs.forEach((job) => {
        (job.charges || []).forEach((c) => {
          if (c[filterField]) uniquePRs.add(c[filterField]);
        });
      });

      const prDetailsMap = {};
      const prPromises = Array.from(uniquePRs).map(async (prNo) => {
        try {
          const detailRes = await axios.get(`${process.env.REACT_APP_API_STRING}/get-payment-request-details/${encodeURIComponent(prNo)}`);
          prDetailsMap[prNo] = detailRes.data;
        } catch (e) {
          console.error(`Failed to fetch PR details for ${prNo}`, e);
          prDetailsMap[prNo] = null;
        }
      });
      await Promise.all(prPromises);

      allJobs.forEach((job) => {
        const charges = job.charges || [];
        const reqMap = new Map();

        charges.forEach((c) => {
          const reqNo = c[filterField];
          if (reqNo && !reqMap.has(reqNo)) {
            const reqDate = c.createdAt || c.payment_request_created_at || "";
            const transMode = c[dataFieldMode] || "-";

            const prDetails = prDetailsMap[reqNo] || {};
            const amount = prDetails.amount || prDetails.totalAmount || prDetails.payment_request_amount || c.payment_request_amount || c.amount || c.total_amount || 0;
            const bankFrom = prDetails.bankFrom || prDetails.bank || prDetails.payment_request_bank || c.payment_request_bank || c.bank || "-";
            const beneficiary = prDetails.paymentTo || prDetails.beneficiary || prDetails.payment_request_beneficiary || c.payment_request_beneficiary || c.beneficiary || "-";

            const containerNos = job.container_nos && Array.isArray(job.container_nos) 
              ? job.container_nos.map((cn) => cn.container_number).filter(Boolean).join(", ") 
              : "-";

            reqMap.set(reqNo, {
              "IMPORTER": job.importer || "-",
              "BOE NO": job.be_no || "-",
              "IGM NO": job.igm_no || "-",
              "SHIPPING LINE": job.shipping_line_airline || "-",
              "BL NO": job.awb_bl_no || "-",
              "CONTAINER NO": containerNos || "-",
              "JOB NO": job.job_number || job.job_no || "-",
              [workMode === "Payment" ? "Payment Request No" : "Purchase Book No"]: reqNo,
              "Date": reqDate ? new Date(reqDate).toLocaleDateString("en-GB") : "-",
              [workMode === "Payment" ? "Transaction Mode" : "Supplier"]: transMode,
              "Amount": amount,
              "bankFrom": bankFrom,
              "paymentTo": beneficiary,
            });
          }
        });

        reqMap.forEach((val) => excelData.push(val));
      });

      if (excelData.length === 0) {
        alert("No data available to export");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      const colWidths = [
        { wch: 30 }, // IMPORTER
        { wch: 20 }, // BOE NO
        { wch: 20 }, // IGM NO
        { wch: 25 }, // SHIPPING LINE
        { wch: 20 }, // BL NO
        { wch: 25 }, // CONTAINER NO
        { wch: 20 }, // JOB NO
        { wch: 25 }, // Payment Request No
        { wch: 15 }, // Date
        { wch: 20 }, // Transaction Mode
        { wch: 15 }, // Amount
        { wch: 20 }, // Bank From
        { wch: 25 }, // Beneficiary
      ];
      worksheet['!cols'] = colWidths;

      const sheetName = workMode === "Payment" ? "Payment Requested" : "Purchase Book Requested";
      const filename = workMode === "Payment" ? "Payment_Requested" : "Purchase_Book_Requested";

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedImporter,
      selectedYearState,
      unresolvedOnly = false,
      username,
      selectedBranch = "all",
      selectedCategory = "all",
      transactionType = "All",
      startDate = "",
      endDate = ""
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-payment-requested-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "",
              username: username || "",
              unresolvedOnly: unresolvedOnly.toString(),
              branchId: selectedBranch || "all",
              category: selectedCategory || "all",
              transactionType: transactionType || "All",
              startDate,
              endDate,
              workMode
            },
          }
        );

        const { totalJobs, totalPages, jobs, unresolvedCount } = res.data;
        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
        setUnresolvedCount(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, workMode]
  );

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

  const handleApprove = async () => {
    if (!user?.first_name || !user?.last_name) {
      alert("User information not found. Please re-login.");
      return;
    }

    const endpoint = workMode === "Purchase Book" ? "approve-purchase-entry" : "approve-payment-request";
    
    setIsApproving(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/${endpoint}`, {
        requestNo: selectedPaymentRequest.requestNo,
        firstName: user.first_name,
        lastName: user.last_name
      });

      if (res.data.success) {
        await fetchPaymentRequestDetails(selectedPaymentRequest.requestNo);
        setOpenApprovalPopup(false);
        // Refresh main table
        fetchJobs(
          page,
          debouncedSearchQuery,
          selectedImporter,
          selectedYearState,
          showUnresolvedOnly,
          user?.username,
          selectedBranch,
          selectedCategory,
          selectedTransactionType
        );
      }
    } catch (err) {
      console.error("Error approving payment request:", err);
      alert("Failed to approve payment request.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
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
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        showUnresolvedOnly,
        user?.username,
        selectedBranch,
        selectedCategory,
        selectedTransactionType
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

  useEffect(() => {
    const { start, end } = calculateDates();
    fetchJobs(
      page,
      debouncedSearchQuery,
      selectedImporter,
      selectedYearState,
      showUnresolvedOnly,
      user?.username,
      selectedBranch,
      selectedCategory,
      selectedTransactionType,
      start,
      end
    );
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    showUnresolvedOnly,
    fetchJobs,
    user?.username,
    selectedBranch,
    selectedCategory,
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
              style={{ display: "inline-block", padding: "10px", textAlign: "center", textDecoration: "none", color: 'blue', whiteSpace: "nowrap" }}
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
          const { be_no, be_date, awb_bl_no, charges, ie_code_no } = cell.row.original;
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
                BL NO: {awb_bl_no || "-"}
                {awb_bl_no && (
                  <IconButton size="small" onClick={(e) => handleCopy(e, awb_bl_no)} sx={{ ml: 0.5, p: 0.2 }}>
                    <ContentCopyIcon sx={{ fontSize: "10px" }} />
                  </IconButton>
                )}
              </div>
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
          const receiptField = workMode === "Payment" ? "payment_request_receipt_url" : "purchase_book_receipt_url";

          const reqGroups = charges.reduce((acc, c) => {
            if (c[filterField] && c[statusField] !== "Paid" && c[statusField] !== "Rejected" && !c[isApprovedField]) {
              if (!acc[c[filterField]]) acc[c[filterField]] = [];
              acc[c[filterField]].push(c.chargeHead);
            }
            return acc;
          }, {});
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.keys(reqGroups).map((no, idx) => {
                const chargesForThisEntry = charges.filter(c => c[filterField] === no);
                const isApproved = chargesForThisEntry.some(c => c[isApprovedField]);
                const receiptUrl = chargesForThisEntry.find(c => c[receiptField])?.[receiptField];

                return (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip 
                          label={no} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                          onClick={() => handleViewPaymentRequest(no)} 
                          sx={{ fontWeight: 'bold', height: '20px' }} 
                        />
                        <IconButton size="small" onClick={(e) => handleCopy(e, no)} title="Copy No" sx={{ p: 0.2 }}>
                          <ContentCopyIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </Box>
                      {chargesForThisEntry.some(c => c.isPostBilling) && (
                        <Chip label="POST-BILLING" size="small" color="error" variant="outlined" sx={{ fontSize: '0.55rem', height: '16px', fontWeight: '900' }} />
                      )}
                      {isApproved && (
                        <Chip label="APPROVED" size="small" color="success" variant="outlined" sx={{ fontSize: '0.55rem', height: '16px', fontWeight: '900', color: '#2e7d32', borderColor: '#2e7d32' }} />
                      )}
                      {receiptUrl && (
                        <IconButton 
                          size="small" 
                          href={receiptUrl} 
                          target="_blank" 
                          sx={{ p: 0, color: '#2e7d32' }}
                          title={workMode === "Payment" ? "View Payment Receipt" : "View Purchase Receipt"}
                        >
                          <OpenInNewIcon sx={{ fontSize: '14px' }} />
                        </IconButton>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>: {[...new Set(reqGroups[no])].join(", ")}</Typography>
                  </Box>
                );
              })}
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
            if (c[filterField] && c[statusField] !== "Paid" && !c[isApprovedField]) {
              if (!acc[c[filterField]]) acc[c[filterField]] = [];
              acc[c[filterField]].push(c[dataField] || "-");
            }
            return acc;
          }, {});
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.keys(reqGroups).map((no, idx) => (
                <Box key={idx} sx={{ minHeight: '20px', display: 'flex', alignItems: 'center' }}>
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
        id: "requested_by",
        header: workMode === "Payment" ? "Requested By" : "Supplier Inv No",
        accessorFn: (row) => {
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const statusField = workMode === "Payment" ? "payment_request_status" : "purchase_book_status";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";

          const charges = row.charges || [];
          const valid = charges.filter(c => c[filterField] && c[statusField] !== "Paid" && !c[isApprovedField]);
          if (valid.length === 0) return 0;
          const d = valid[0].createdAt || valid[0].payment_request_created_at;
          return d ? new Date(d).getTime() : 0;
        },
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const dataField = workMode === "Payment" ? "payment_request_requested_by" : "supplier_inv_no";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";
          const statusField = workMode === "Payment" ? "payment_request_status" : "purchase_book_status";

          const entries = charges
            .filter(c => c[filterField] && c[statusField] !== "Paid" && !c[isApprovedField])
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
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>{workMode === "Payment" ? "Payment Requested" : "Purchase Book Requested"}: {totalJobs}</Typography>
        <Autocomplete sx={{ width: "250px" }} options={importerNames.map(o => o.label)} value={selectedImporter || ""} onInputChange={(e, v) => { setSelectedImporter(v); setPage(1); }} renderInput={(params) => <TextField {...params} size="small" label="Select Importer" />} />
        <TextField select size="small" value={selectedYearState} onChange={(e) => setSelectedYearState(e.target.value)} sx={{ width: "100px" }}>{years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
        
        {/* Date Filter */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1a237e' }}>DATE:</Typography>
          <TextField
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
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
        <TextField placeholder="Search..." size="small" value={searchQuery} onChange={handleSearchInputChange} sx={{ width: "250px" }} />
        <Button variant="contained" color="primary" onClick={() => { setShowUnresolvedOnly(!showUnresolvedOnly); setPage(1); }}>{showUnresolvedOnly ? "SHOW ALL" : "PENDING QUERIES"}</Button>
        <Button
          size="small"
          variant="contained"
          color="success"
          onClick={handleDownloadExcel}
          disabled={isExporting}
          sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 'bold', ml: 1, py: '6px', px: '16px' }}
        >
          {isExporting ? "Exporting..." : "Download Excel"}
        </Button>
      </div>
    ),
  };

  return (
    <div style={{ height: "100%" }}>
      <MaterialReactTable {...tableConfig} />
      <Box display="flex" justifyContent="center" mt={2}><Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" /></Box>

      <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0, border: '2px solid #1a237e' } }}>
        <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 2, fontSize: '1rem' }}>
          <span>{selectedPaymentRequest?.isPurchaseBook ? "PURCHASE BOOK DETAILS" : "PAYMENT REQUEST DETAILS"}</span>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', opacity: 0.8 }}>{selectedPaymentRequest?.requestNo || "N/A"}</Typography>
            {selectedPaymentRequest?.requestNo && (
              <IconButton size="small" onClick={(e) => handleCopy(e, selectedPaymentRequest.requestNo)} sx={{ color: '#fff', opacity: 0.8, p: 0.5 }} title="Copy No">
                <ContentCopyIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            )}
          </Box>
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
                      {selectedPaymentRequest.requestDate || (selectedPaymentRequest.createdAt ? new Date(selectedPaymentRequest.createdAt).toLocaleDateString('en-GB') : "N/A")}
                    </Typography>
                  </Grid>

                  <Grid item xs={4} sx={{ borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc', p: 1, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="caption" fontWeight="bold">Job No</Typography>
                  </Grid>
                  <Grid item xs={8} sx={{ borderBottom: '1px solid #ccc', p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{selectedPaymentRequest.jobNo}</Typography>
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
          
          {!isModalLoading && selectedPaymentRequest && 
            !selectedPaymentRequest.isApproved && 
            !selectedPaymentRequest.isRejected && 
            selectedPaymentRequest.status !== 'Rejected' && 
            selectedPaymentRequest.status !== 'Approved' && 
            selectedPaymentRequest.status !== 'Paid' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained" 
                color="error" 
                size="small" 
                onClick={() => setOpenRejectPopup(true)}
                sx={{ fontWeight: 'bold' }}
              >
                Reject Request
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                size="small" 
                onClick={() => setOpenApprovalPopup(true)}
                sx={{ fontWeight: 'bold' }}
              >
                Approve Request
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={openApprovalPopup} onClose={() => !isApproving && setOpenApprovalPopup(false)} PaperProps={{ sx: { borderRadius: 0, width: '400px', border: '2px solid #2e7d32' } }}>
        <DialogTitle sx={{ backgroundColor: '#2e7d32', color: 'white', fontWeight: 'bold', py: 1.5 }}>CONFIRM APPROVAL</DialogTitle>
        <DialogContent sx={{ p: 2, mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>Are you sure you want to approve this payment request?</Typography>
          <Typography variant="subtitle2" fontWeight="bold" color="primary">{selectedPaymentRequest?.requestNo}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 1, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setOpenApprovalPopup(false)} size="small" disabled={isApproving}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success" size="small" disabled={isApproving}>
            {isApproving ? <CircularProgress size={20} color="inherit" /> : "Confirm Approve"}
          </Button>
        </DialogActions>
      </Dialog>

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
            placeholder="Enter rejection reason here..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={isRejecting}
            error={!rejectionReason && isRejecting}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Note: Rejecting will reset the charges in the Job record, allowing them to be edited and re-requested.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 1, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setOpenRejectPopup(false)} size="small" disabled={isRejecting}>Cancel</Button>
          <Button 
            onClick={handleReject} 
            variant="contained" 
            color="error" 
            size="small" 
            disabled={isRejecting || !rejectionReason.trim()}
          >
            {isRejecting ? <CircularProgress size={20} color="inherit" /> : "Confirm Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default PaymentRequested;

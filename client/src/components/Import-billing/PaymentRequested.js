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
  FormControlLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
  } = useSearchQuery();
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const { user } = useContext(UserContext);
  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
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

  // New States for Approval Workflow
  const [openApprovalPopup, setOpenApprovalPopup] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [openRejectPopup, setOpenRejectPopup] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTransactionType, setSelectedTransactionType] = useState("All");

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
      transactionType = "All"
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
          selectedCategory
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
        selectedCategory
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
    workMode
  ]);

  useEffect(() => {
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
              {cell.row.original.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br /> {custom_house}
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
        accessorKey: workMode === "Payment" ? "payment_request_nos" : "purchase_book_nos",
        header: workMode === "Payment" ? "Payment Request No" : "Purchase Book No",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";
          const statusField = workMode === "Payment" ? "payment_request_status" : "purchase_book_status";
          const receiptField = workMode === "Payment" ? "payment_request_receipt_url" : "purchase_book_receipt_url";

          const reqGroups = charges.reduce((acc, c) => {
            if (c[filterField] && c[statusField] !== "Paid" && !c[isApprovedField]) {
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
                      <Chip 
                        label={no} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                        onClick={() => handleViewPaymentRequest(no)} 
                        sx={{ fontWeight: 'bold', height: '20px' }} 
                      />
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
        accessorKey: workMode === "Payment" ? "requested_by" : "supplier_inv_no",
        header: workMode === "Payment" ? "Requested By" : "Supplier Inv No",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const filterField = workMode === "Payment" ? "payment_request_no" : "purchase_book_no";
          const dataField = workMode === "Payment" ? "payment_request_requested_by" : "supplier_inv_no";
          const isApprovedField = workMode === "Payment" ? "payment_request_is_approved" : "purchase_book_is_approved";
          const statusField = workMode === "Payment" ? "payment_request_status" : "purchase_book_status";

          const entries = [...new Set(charges
            .filter(c => c[filterField] && c[statusField] !== "Paid" && !c[isApprovedField])
            .map(c => c[dataField])
            .filter(Boolean))];
          return entries.length > 0 ? (
            <div style={{ fontSize: '0.75rem', fontWeight: '500' }}>
              {entries.map((r, i) => <div key={i}>{r}</div>)}
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
        <Autocomplete sx={{ width: "250px" }} options={importerNames.map(o => o.label)} value={selectedImporter || ""} onInputChange={(e, v) => setSelectedImporter(v)} renderInput={(params) => <TextField {...params} size="small" label="Select Importer" />} />
        <TextField select size="small" value={selectedYearState} onChange={(e) => setSelectedYearState(e.target.value)} sx={{ width: "100px" }}>{years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
        <TextField 
          select 
          size="small" 
          label="Transaction Type" 
          value={selectedTransactionType} 
          onChange={(e) => setSelectedTransactionType(e.target.value)} 
          sx={{ width: "180px" }}
        >
          {["All", "NEFT", "CHEQUE", "CASH", "IMPS", "RTGS", "ONLINE", "DEMAND DRAFT"].map(type => (
            <MenuItem key={type} value={type}>{type}</MenuItem>
          ))}
        </TextField>
        <TextField placeholder="Search..." size="small" value={searchQuery} onChange={handleSearchInputChange} sx={{ width: "250px" }} />
        <Button variant="contained" color="primary" onClick={() => setShowUnresolvedOnly(!showUnresolvedOnly)}>{showUnresolvedOnly ? "SHOW ALL" : "PENDING QUERIES"}</Button>
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
          <Typography variant="subtitle2" sx={{ color: '#fff', opacity: 0.8 }}>{selectedPaymentRequest?.requestNo || "N/A"}</Typography>
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
          
          {!isModalLoading && selectedPaymentRequest && !selectedPaymentRequest.isApproved && !selectedPaymentRequest.isRejected && (
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

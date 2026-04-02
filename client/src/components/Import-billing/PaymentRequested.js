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
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext.js";
import { BranchContext } from "../../contexts/BranchContext.js";

import ContainerTrackButton from '../ContainerTrackButton';
import logo from "../../assets/images/logo.webp";

function PaymentRequested() {
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
  const [importers, setImporters] = useState("");
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // New States for Approval Workflow
  const [openApprovalPopup, setOpenApprovalPopup] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

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

    setIsApproving(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/approve-payment-request`, {
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
        // If approved, it moves out of this tab, so close modal
        setOpenDetailModal(false);
      }
    } catch (err) {
      console.error("Error approving payment request:", err);
      alert("Failed to approve payment request. Please try again.");
    } finally {
      setIsApproving(false);
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
      unresolvedOnly = false,
      username,
      selectedBranch = "all",
      selectedCategory = "all"
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
    [limit]
  );

  useEffect(() => {
    if (selectedYearState && user?.username) {
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        showUnresolvedOnly,
        user.username,
        selectedBranch,
        selectedCategory
      );
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    user?.username,
    showUnresolvedOnly,
    fetchJobs,
    selectedBranch,
    selectedCategory,
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
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "10px", textAlign: "center", textDecoration: "none", color: 'blue', whiteSpace: "nowrap" }}
            >
              {cell.row.original.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br /> {custom_house}
            </Link>
          );
        },
      },
      { accessorKey: "importer", header: "Importer", size: 150 },
      {
        accessorKey: "container_numbers",
        header: "Container Numbers",
        Cell: ({ cell }) => (
          <React.Fragment>
            {cell.row.original.container_nos?.map((container, id) => (
              <div key={id} style={{ marginBottom: "4px" }}>
                {container.container_number} <ContainerTrackButton customHouse={cell.row.original.custom_house} containerNo={container.container_number} /> | "{container.size}"
                <IconButton size="small" onClick={(e) => handleCopy(e, container.container_number)}><ContentCopyIcon fontSize="inherit" /></IconButton>
              </div>
            ))}
          </React.Fragment>
        ),
      },
      {
        accessorKey: "be_no",
        header: "BE Number & Date",
        Cell: ({ cell }) => (
          <div>
            {cell.row.original.be_no || "-"} <br />
            {cell.row.original.be_date ? new Date(cell.row.original.be_date).toLocaleDateString("en-GB") : "-"}
          </div>
        ),
      },
      {
        accessorKey: "payment_request_nos",
        header: "Payment Request No",
        Cell: ({ cell }) => {
          const charges = cell.row.original.charges || [];
          const reqGroups = charges.reduce((acc, c) => {
            if (c.payment_request_no) {
              if (!acc[c.payment_request_no]) acc[c.payment_request_no] = [];
              acc[c.payment_request_no].push(c.chargeHead);
            }
            return acc;
          }, {});
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.keys(reqGroups).map((no, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={no} size="small" color="primary" variant="outlined" onClick={() => handleViewPaymentRequest(no)} sx={{ fontWeight: 'bold', height: '20px' }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>: {[...new Set(reqGroups[no])].join(", ")}</Typography>
                </Box>
              ))}
            </Box>
          );
        },
      },
    ],
    [handleCopy]
  );

  const tableConfig = {
    columns,
    data: rows,
    enablePagination: false,
    enableBottomToolbar: false,
    muiTableContainerProps: { sx: { maxHeight: "650px" } },
    renderTopToolbarCustomActions: () => (
      <div style={{ display: "flex", alignItems: "center", width: "100%", padding: '10px', gap: '20px' }}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>Total Jobs: {totalJobs}</Typography>
        <Autocomplete sx={{ width: "300px" }} options={importerNames.map(o => o.label)} value={selectedImporter || ""} onInputChange={(e, v) => setSelectedImporter(v)} renderInput={(params) => <TextField {...params} size="small" label="Select Importer" />} />
        <TextField select size="small" value={selectedYearState} onChange={(e) => setSelectedYearState(e.target.value)} sx={{ width: "150px" }}>{years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
        <TextField placeholder="Search..." size="small" value={searchQuery} onChange={handleSearchInputChange} sx={{ width: "300px" }} />
        <Badge badgeContent={unresolvedCount} color="error">
          <Button variant="contained" size="small" onClick={() => setShowUnresolvedOnly(p => !p)}>{showUnresolvedOnly ? "Show All" : "Pending Queries"}</Button>
        </Badge>
      </div>
    ),
  };

  return (
    <div style={{ height: "100%" }}>
      <MaterialReactTable {...tableConfig} />
      <Box display="flex" justifyContent="center" mt={2}><Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" /></Box>

      <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>PAYMENT REQUEST</span>
          <Chip label={selectedPaymentRequest?.requestNo || "N/A"} size="medium" sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} />
        </DialogTitle>
        <DialogContent sx={{ p: 0, backgroundColor: '#f8f9fa' }}>
          {isModalLoading ? <Box display="flex" justifyContent="center" p={8}><CircularProgress size={60} /></Box> : selectedPaymentRequest && (
            <Box sx={{ p: 4 }}>
              <Paper variant="outlined" sx={{ p: 4, position: 'relative', overflow: 'hidden', backgroundColor: '#fff', borderRadius: 2 }}>
                <Box component="img" src={logo} sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.1, width: '60%', pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
                    <Typography variant="h6" color="text.secondary">Import Billing Services</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight="bold">Date: {selectedPaymentRequest.requestDate || new Date(selectedPaymentRequest.createdAt).toLocaleDateString('en-GB')}</Typography>
                      <Typography variant="body2" color="text.secondary">Ref: {selectedPaymentRequest.jobNo}</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 4 }} />
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">Beneficiary Information</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Beneficiary Name</Typography>
                        <Typography variant="h6" fontWeight="bold">{selectedPaymentRequest.paymentTo || "N/A"}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Against Bill / Reference</Typography>
                        <Typography variant="body1">{selectedPaymentRequest.againstBill || "-"}</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {selectedPaymentRequest.attachments?.length > 0 && (
                    <Box sx={{ mb: 4, p: 2, borderRadius: 2, backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
                      <Typography variant="overline" color="primary" fontWeight="bold" mb={1} display="block">Attachments</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {selectedPaymentRequest.attachments.map((url, idx) => (
                          <Button key={idx} variant="contained" size="small" startIcon={<AttachFileIcon />} href={url} target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none', borderRadius: '20px' }}>View Attachment {idx + 1}</Button>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ mb: 4, p: 3, backgroundColor: '#f1f3f4', borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Requested Amount</Typography>
                        <Typography variant="h4" color="primary" fontWeight="bold">₹ {selectedPaymentRequest.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} sx={{ display: 'flex', gap: 2 }}>
                        <Box><Typography variant="subtitle2" color="text.secondary">Transaction</Typography><Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.transactionType || "NEFT"}</Typography></Box>
                        <Box><Typography variant="subtitle2" color="text.secondary">Transfer Mode</Typography><Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.transferMode || "Online"}</Typography></Box>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ mb: 4 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">Bank Details</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Bank Name</Typography><Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.bankName || "N/A"}</Typography></Grid>
                      <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">Account Number</Typography><Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.accountNo || "N/A"}</Typography></Grid>
                      <Grid item xs={12} sm={4}><Typography variant="subtitle2" color="text.secondary">IFSC Code</Typography><Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.ifscCode || "N/A"}</Typography></Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 4 }} />

                  {!selectedPaymentRequest.isApproved && (
                    <Box sx={{ p: 3, border: '1px solid #1976d2', borderRadius: 2, backgroundColor: '#f0f7ff', textAlign: 'center' }}>
                      <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>Request Approval</Typography>
                      <Typography variant="body2" color="text.secondary" mb={3}>Checking the box will capture your identity for approval.</Typography>
                      <FormControlLabel
                        control={<Checkbox checked={openApprovalPopup} onChange={(e) => setOpenApprovalPopup(e.target.checked)} sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }} />}
                        label={<Typography variant="body1" fontWeight="bold">I approve this payment request</Typography>}
                      />
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => window.print()} startIcon={<SearchIcon />} variant="outlined">Print</Button>
          <Button onClick={() => setOpenDetailModal(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openApprovalPopup} onClose={() => !isApproving && setOpenApprovalPopup(false)} PaperProps={{ sx: { borderRadius: 2, width: '400px' } }}>
        <DialogTitle sx={{ backgroundColor: '#2e7d32', color: 'white', fontWeight: 'bold' }}>Confirm Approval</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>Confirm Approval</Typography>
          <Typography variant="body2">Are you sure you want to approve this request as:</Typography>
          <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>{user?.first_name} {user?.last_name}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenApprovalPopup(false)} disabled={isApproving}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={isApproving}>{isApproving ? <CircularProgress size={24} /> : "Confirm Approval"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default PaymentRequested;

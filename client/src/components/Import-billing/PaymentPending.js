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
  Grid
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext.js";
import { BranchContext } from "../../contexts/BranchContext.js";

import ContainerTrackButton from '../ContainerTrackButton';
import logo from "../../assets/images/logo.webp";

function PaymentPending() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
  } = useSearchQuery();
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
  const [utrInput, setUtrInput] = useState("");
  const [bankFromInput, setBankFromInput] = useState("");
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);

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

  const handleUpdateUTR = async () => {
    if (!utrInput.trim() || !bankFromInput) {
      alert("Please enter both UTR Number and Bank From.");
      return;
    }
    setIsSubmittingUtr(true);
    try {
      const displayName = user ? `${user.first_name} ${user.last_name}` : (localStorage.getItem("username") || "Unknown");
      await axios.patch(`${process.env.REACT_APP_API_STRING}/update-payment-utr`, {
        requestNo: selectedPaymentRequest.requestNo,
        utrNumber: utrInput,
        bankFrom: bankFromInput
      }, {
        headers: { username: displayName }
      });
      
      setUtrInput("");
      setBankFromInput("");
      setOpenDetailModal(false);
      // Refresh main table
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        user?.username,
        selectedBranch,
        selectedCategory
      );
    } catch (err) {
      console.error("Error updating UTR:", err);
      alert("Failed to update UTR. Please try again.");
    } finally {
      setIsSubmittingUtr(false);
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
      selectedCategory = "all"
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
    [limit, user?.username]
  );

  useEffect(() => {
    if (selectedYearState && user?.username) {
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
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
              style={{ display: "inline-block", padding: "10px", textAlign: "center", textDecoration: "none", color: 'blue' }}
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
          <>
            {cell.row.original.container_nos?.map((container, id) => (
              <div key={id} style={{ marginBottom: "4px" }}>
                {container.container_number} <ContainerTrackButton customHouse={cell.row.original.custom_house} containerNo={container.container_number} /> | "{container.size}"
                <IconButton size="small" onClick={(e) => handleCopy(e, container.container_number)}><ContentCopyIcon fontSize="inherit" /></IconButton>
              </div>
            ))}
          </>
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
                <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>{[...new Set(reqGroups[no])].join(", ")}:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label={no} size="small" color="primary" variant="outlined" onClick={() => handleViewPaymentRequest(no)} sx={{ fontWeight: 'bold', height: '20px' }} />
                    <Chip label="APPROVED" size="small" color="success" variant="outlined" sx={{ fontSize: '0.55rem', height: '16px', fontWeight: '900', color: '#2e7d32', borderColor: '#2e7d32' }} />
                  </Box>
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
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>Approved Payments: {totalJobs}</Typography>
        <Autocomplete sx={{ width: "300px" }} options={importerNames.map(o => o.label)} value={selectedImporter || ""} onInputChange={(e, v) => setSelectedImporter(v)} renderInput={(params) => <TextField {...params} size="small" label="Filter Importer" />} />
        <TextField select size="small" value={selectedYearState} onChange={(e) => setSelectedYearState(e.target.value)} sx={{ width: "150px" }}>{years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField>
        <TextField placeholder="Search..." size="small" value={searchQuery} onChange={handleSearchInputChange} sx={{ width: "300px" }} />
      </div>
    ),
  };

  return (
    <div style={{ height: "100%", padding: '20px' }}>
      <MaterialReactTable {...tableConfig} />
      <Box display="flex" justifyContent="center" mt={2}><Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" /></Box>

      <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img src={logo} alt="Logo" style={{ height: '40px' }} />
            <Typography variant="h6" fontWeight="bold">Payment Stage: Approved Request</Typography>
          </Box>
          <Chip label="APPROVED" color="success" sx={{ fontWeight: 'bold' }} />
        </DialogTitle>
        <DialogContent dividers>
          {isModalLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> : selectedPaymentRequest && (
            <Box>
              {/* Approval Info Section */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#e8f5e9', borderRadius: 1, borderLeft: '4px solid #2e7d32' }}>
                <Typography variant="subtitle2" color="success.main" fontWeight="bold" gutterBottom>Request Approval Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Approved By</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.isApproved ? `${selectedPaymentRequest.approvedByFirst} ${selectedPaymentRequest.approvedByLast}` : "N/A"}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Approved On</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedPaymentRequest.approvedAt ? new Date(selectedPaymentRequest.approvedAt).toLocaleString('en-GB') : "N/A"}</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">Request Information</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#fafafa' }}>
                    <Typography variant="body2">Request No: <strong>{selectedPaymentRequest.requestNo}</strong></Typography>
                    <Typography variant="body2">Date: <strong>{new Date(selectedPaymentRequest.date).toLocaleDateString('en-GB')}</strong></Typography>
                    <Typography variant="body2">Importer: <strong>{selectedPaymentRequest.importer}</strong></Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">Beneficiary Details</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#fafafa' }}>
                    <Typography variant="body2">Name: <strong>{selectedPaymentRequest.beneficiaryName}</strong></Typography>
                    <Typography variant="body2">A/C: <strong>{selectedPaymentRequest.accountNo}</strong></Typography>
                    <Typography variant="body2">IFSC: <strong>{selectedPaymentRequest.ifscCode}</strong></Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, p: 3, backgroundColor: '#f1f3f4', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Total Approved Amount</Typography>
                <Typography variant="h4" color="success.main" fontWeight="bold">₹ {selectedPaymentRequest.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Box sx={{ p: 3, border: '2px solid #1976d2', borderRadius: 2, backgroundColor: '#f0f7ff' }}>
                <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>Enter Payment Details (UTR)</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>Once the payment is processed in the bank, please enter the bank name and UTR number here.</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField 
                      select 
                      sx={{ minWidth: '200px' }} 
                      size="small" 
                      label="Bank From" 
                      required 
                      value={bankFromInput} 
                      onChange={(e) => setBankFromInput(e.target.value)}
                    >
                      <MenuItem value="">SELECT BANK</MenuItem>
                      <MenuItem value="HDFC BANK">HDFC BANK</MenuItem>
                      <MenuItem value="ICICI BANK">ICICI BANK</MenuItem>
                      <MenuItem value="SBI BANK">SBI BANK</MenuItem>
                      <MenuItem value="KOTAK BANK">KOTAK BANK</MenuItem>
                      <MenuItem value="IDBI BANK">IDBI BANK</MenuItem>
                      <MenuItem value="SOUTH INDIAN BANK">SOUTH INDIAN BANK</MenuItem>
                    </TextField>
                    <TextField 
                      fullWidth 
                      size="small" 
                      label="Enter UTR Number" 
                      variant="outlined" 
                      required
                      value={utrInput} 
                      onChange={(e) => setUtrInput(e.target.value)} 
                    />
                  </Box>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleUpdateUTR} 
                    disabled={!utrInput.trim() || !bankFromInput || isSubmittingUtr} 
                    sx={{ width: '100%', height: '40px', fontWeight: 'bold' }}
                  >
                    {isSubmittingUtr ? <CircularProgress size={24} /> : "MARK AS PAID"}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setOpenDetailModal(false)}>Cancel</Button></DialogActions>
      </Dialog>
    </div>
  );
}

export default PaymentPending;

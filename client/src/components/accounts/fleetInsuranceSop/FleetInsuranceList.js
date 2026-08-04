import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  TablePagination,
  CircularProgress,
  Stack,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  Alert,
  AlertTitle,
  Chip
} from "@mui/material";
import { toast } from "react-hot-toast";

import { Edit, Delete, GetApp, Add, FileDownload, Visibility, Autorenew, CheckCircle, HourglassEmpty, History } from "@mui/icons-material";
import FleetInsuranceHistory from "./FleetInsuranceHistory";

function FleetInsuranceList({ onViewHistory, onRenew, onCreate, onOpenApproval, onOpenPaymentUtr, onEdit, onView }) {
  const [mainTab, setMainTab] = useState(0); // 0 = Vehicle Records, 1 = Policy History Dashboard, 2 = Approval, 3 = Payment & UTR
  const [selectedHistoryRegNo, setSelectedHistoryRegNo] = useState("");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  const [approvalRecords, setApprovalRecords] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [paymentUtrRecords, setPaymentUtrRecords] = useState([]);
  const [paymentUtrLoading, setPaymentUtrLoading] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    regNo: "",
    owner: "",
    size: "",
    modelType: "",
    premiumAmount: "",
    premiumQuote: "",
    expiryDate: "",
    renewed: ""
  });

  const [filterOptions, setFilterOptions] = useState({
    owners: [],
    sizes: [],
    models: []
  });

  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/filters/options`);
      setFilterOptions({
        owners: res.data.owners || [],
        sizes: res.data.sizes || [],
        models: res.data.models || []
      });
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  const fetchApprovalRecords = async () => {
    setApprovalLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/approvals/list`);
      setApprovalRecords(res.data.data || []);
    } catch (err) {
      console.error("Error fetching approval records:", err);
    } finally {
      setApprovalLoading(false);
    }
  };

  const fetchPaymentUtrRecords = async () => {
    setPaymentUtrLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/payment-utr/list`);
      setPaymentUtrRecords(res.data.data || []);
    } catch (err) {
      console.error("Error fetching payment UTR records:", err);
    } finally {
      setPaymentUtrLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchApprovalRecords();
    fetchPaymentUtrRecords();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop`, {
        params: {
          search,
          month,
          year,
          page: page + 1,
          limit: rowsPerPage,
          ...filters
        },
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching Fleet Insurance SOP list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchRecords();
    }, 500);
    return () => clearTimeout(delay);
  }, [page, rowsPerPage, search, month, year, filters]);

  // const handleDelete = async (id) => {
  //   if (!window.confirm("Are you sure you want to delete this Record?")) return;
  //   try {
  //     await axios.delete(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${id}`);
  //     fetchRecords();
  //     fetchApprovalRecords();
  //   } catch (err) {
  //     console.error("Error deleting Record:", err);
  //     alert("Failed to delete Record");
  //   }
  // };

  const handleExport = async (id, registrationNo) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Fleet_Insurance_${registrationNo || "Export"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting excel:", err);
      alert("Failed to export Excel");
    }
  };

  const handleBulkExport = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/export/bulk`, {
        params: { search, month, year },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      let filename = "Fleet_Insurance_Export.xlsx";
      if (month && year) filename = `Fleet_Insurance_${month}_${year}.xlsx`;
      else if (year) filename = `Fleet_Insurance_${year}.xlsx`;
      else if (month) filename = `Fleet_Insurance_Month_${month}.xlsx`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error bulk exporting excel:", err);
      alert("Failed to export bulk Excel");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/template/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Fleet_Insurance_SOP_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template");
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this fleet insurance record?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${id}`);
      toast.success("Record deleted successfully");
      fetchRecords();
      fetchApprovalRecords();
      fetchPaymentUtrRecords();
    } catch (err) {
      console.error("Error deleting record:", err);
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getExpiryDateColor = (dateStr) => {
    if (!dateStr) return "inherit";
    const expiry = new Date(dateStr);
    const now = new Date();
    expiry.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "red";
    if (diffDays <= 7) return "orange";
    return "green";
  };

  // Identify expiring records (within 7 days of today's date and not yet renewed)
  const expiringRecords = data.filter((row) => {
    if (!row.policyToDate) return false;
    if (String(row.renewed).toUpperCase() === "YES" || row.renewalStatus === "Renewed") return false;
    const expiry = new Date(row.policyToDate);
    const now = new Date();
    expiry.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1a237e" }}>
            Fleet Insurance Tracker
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" color="success" startIcon={<FileDownload />} onClick={handleBulkExport}>
              Download Monthly Report
            </Button>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={handleDownloadTemplate}>
              Excel Template
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={onCreate}>
              Add Vehicle Record
            </Button>
          </Stack>
        </Stack>

        {/* ─── Four Tabs: Vehicle Records, Policy History & Dashboard, Approval, Payment & UTR ─── */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs value={mainTab} onChange={(e, val) => setMainTab(val)} aria-label="fleet insurance top tabs">
            <Tab label="Vehicle Records" id="fleet-tab-0" />
            <Tab label="Policy History & Dashboard" id="fleet-tab-1" />
            <Tab
              label={
                <Badge badgeContent={approvalRecords.length} color="error" offset={[10, 0]}>
                  Approval
                </Badge>
              }
              id="fleet-tab-2"
            />
            <Tab
              label={
                <Badge badgeContent={paymentUtrRecords.filter(r => !r.paymentUtr).length} color="success" offset={[10, 0]}>
                  Payment & UTR
                </Badge>
              }
              id="fleet-tab-3"
            />
          </Tabs>
        </Box>

        {mainTab === 0 && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Search by Reg No, Owner, Insurer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              select
              label="Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Months</MenuItem>
              <MenuItem value="1">January</MenuItem>
              <MenuItem value="2">February</MenuItem>
              <MenuItem value="3">March</MenuItem>
              <MenuItem value="4">April</MenuItem>
              <MenuItem value="5">May</MenuItem>
              <MenuItem value="6">June</MenuItem>
              <MenuItem value="7">July</MenuItem>
              <MenuItem value="8">August</MenuItem>
              <MenuItem value="9">September</MenuItem>
              <MenuItem value="10">October</MenuItem>
              <MenuItem value="11">November</MenuItem>
              <MenuItem value="12">December</MenuItem>
            </TextField>
            <TextField
              select
              label="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Years</MenuItem>
              <MenuItem value="2024">2024</MenuItem>
              <MenuItem value="2025">2025</MenuItem>
              <MenuItem value="2026">2026</MenuItem>
              <MenuItem value="2027">2027</MenuItem>
            </TextField>
          </Stack>
        )}
      </Paper>

      {/* ─── Notification Alert for Expiring Policies (7 Days before today's date) ─── */}
      {expiringRecords.length > 0 && mainTab === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle sx={{ fontWeight: "bold" }}>Policy Expiry Notice (7 Days Threshold)</AlertTitle>
          There {expiringRecords.length === 1 ? "is 1 vehicle policy" : `are ${expiringRecords.length} vehicle policies`} expiring within 7 days or past due requiring renewal:
          {" "}<strong>{expiringRecords.map(r => r.registrationNo).join(", ")}</strong>.
          Once renewed with new entry and new expiry date, this notice will automatically be removed.
        </Alert>
      )}

      {/* ─── TAB 1: VEHICLE RECORDS ─── */}
      {mainTab === 0 && (
        <TableContainer component={Paper}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Reg No</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Owner</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Size</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Model</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Previous Premium (₹)</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>New Premium Quote (₹)</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Expiry Date</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Renewed?</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="center">Actions</TableCell>
                </TableRow>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField size="small" placeholder="Filter..." value={filters.regNo} onChange={(e) => handleFilterChange("regNo", e.target.value)} variant="standard" fullWidth />
                  </TableCell>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField select size="small" value={filters.owner} onChange={(e) => handleFilterChange("owner", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }} >
                      <MenuItem value="">All</MenuItem>
                      {filterOptions.owners.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField select size="small" value={filters.size} onChange={(e) => handleFilterChange("size", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }}>
                      <MenuItem value="">All</MenuItem>
                      {filterOptions.sizes.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField select size="small" value={filters.modelType} onChange={(e) => handleFilterChange("modelType", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }}>
                      <MenuItem value="">All</MenuItem>
                      {filterOptions.models.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField size="small" placeholder="Filter..." value={filters.premiumAmount} onChange={(e) => handleFilterChange("premiumAmount", e.target.value)} variant="standard" fullWidth />
                  </TableCell>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField size="small" placeholder="Filter..." value={filters.premiumQuote} onChange={(e) => handleFilterChange("premiumQuote", e.target.value)} variant="standard" fullWidth />
                  </TableCell>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField size="small" placeholder="Filter date..." value={filters.expiryDate} onChange={(e) => handleFilterChange("expiryDate", e.target.value)} variant="standard" fullWidth />
                  </TableCell>
                  <TableCell padding="none" sx={{ px: 1 }}>
                    <TextField select size="small" value={filters.renewed} onChange={(e) => handleFilterChange("renewed", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="YES">Yes</MenuItem>
                      <MenuItem value="NO">No</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">No records found</TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell sx={{ fontWeight: "bold" }}>{row.registrationNo}</TableCell>
                      <TableCell>{row.owner || "-"}</TableCell>
                      <TableCell>{row.size || "-"}</TableCell>
                      <TableCell>{row.modelType || "-"}</TableCell>
                      <TableCell>
                        {row.premiumAmount
                          ? Number(row.premiumAmount).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                          : "-"}
                      </TableCell>
                      <TableCell sx={{
                        color: row.premiumQuote && row.premiumAmount
                          ? (Number(row.premiumQuote) > Number(row.premiumAmount) ? "red" : Number(row.premiumQuote) < Number(row.premiumAmount) ? "green" : "inherit")
                          : "inherit",
                        fontWeight: row.premiumQuote && row.premiumAmount && Number(row.premiumQuote) !== Number(row.premiumAmount) ? "bold" : "normal"
                      }}>
                        {row.premiumQuote
                          ? Number(row.premiumQuote).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                          : "-"}
                      </TableCell>
                      <TableCell sx={{ color: getExpiryDateColor(row.policyToDate), fontWeight: "bold" }}>
                        {row.policyToDate ? new Date(row.policyToDate).toLocaleDateString("en-IN") : "-"}
                      </TableCell>
                      <TableCell>{row.renewed || "NO"}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => { setSelectedHistoryRegNo(row.registrationNo); setMainTab(1); }} title="View Multi-Year History Dashboard">
                          <History fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="success" onClick={() => onRenew(row)} title="Renew Policy">
                          <Autorenew fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="secondary" onClick={() => handleExport(row._id, row.registrationNo)} title="Export Record">
                          <GetApp fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(row._id)} title="Delete Record">
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      )}

      {/* ─── TAB 2: POLICY HISTORY DASHBOARD ─── */}
      {mainTab === 1 && (
        <FleetInsuranceHistory
          registrationNo={selectedHistoryRegNo}
          onEdit={onEdit}
          onRenew={onRenew}
          onView={onView}
        />
      )}

      {/* ─── TAB 3: APPROVAL ─── */}
      {mainTab === 2 && (
        <TableContainer component={Paper}>
          <Box sx={{ p: 2, backgroundColor: "#f8f9fa", borderBottom: "1px solid #e0e0e0" }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary">
              Financial Approvals Stage
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Entries requiring approval assigned to Finance Manager. Click "Review & Approve" to navigate directly to the approval stage.
            </Typography>
          </Box>

          {approvalLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Reg No</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Owner</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>PR Number</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>PR Date</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Premium Amount (₹)</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Approval Stage</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Assigned Role / Approver</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Status</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {approvalRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">No pending approvals at this time</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  approvalRecords.map((row) => (
                    <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => onOpenApproval(row)}>
                      <TableCell sx={{ fontWeight: "bold", color: "#1a237e" }}>{row.registrationNo}</TableCell>
                      <TableCell>{row.owner || "-"}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>{row.prNumber || "N/A"}</TableCell>
                      <TableCell>{row.prDate ? new Date(row.prDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        ₹ {row.totalPolicyPremium || row.premiumQuote || row.premiumAmount || 0}
                      </TableCell>
                      <TableCell>
                        <Chip label="3. Finance Approval" size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                        Finance Manager
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.financialApprovalStatus || "Pending"}
                          size="small"
                          color={row.financialApprovalStatus === "Approved" ? "success" : row.financialApprovalStatus === "Rejected" ? "error" : "warning"}
                        />
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<CheckCircle fontSize="small" />}
                          onClick={() => onOpenApproval(row)}
                        >
                          Review & Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      )}

      {/* ─── TAB 4: PAYMENT & UTR STAGE ─── */}
      {mainTab === 3 && (
        <TableContainer component={Paper}>
          <Box sx={{ p: 2, backgroundColor: "#f8f9fa", borderBottom: "1px solid #e0e0e0" }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary">
              Payment & UTR Stage (Approved Policies)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Policies approved by Finance Manager. Enter UTR details to complete renewal.
            </Typography>
          </Box>

          {paymentUtrLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Reg No</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Owner</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>PR Number</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Financial Approval</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Renewed Premium (₹)</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Payment UTR</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Payment Date</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Renewal Status</TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentUtrRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">No approved policies pending payment UTR at this time</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentUtrRecords.map((row) => (
                    <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => onOpenPaymentUtr && onOpenPaymentUtr(row)}>
                      <TableCell sx={{ fontWeight: "bold", color: "#1a237e" }}>{row.registrationNo}</TableCell>
                      <TableCell>{row.owner || "-"}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>{row.prNumber || "N/A"}</TableCell>
                      <TableCell>
                        <Chip label={row.financialApprovalStatus || "Approved"} size="small" color="success" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: "primary.main" }}>
                        ₹ {Number(row.newTotalPolicyPremium || row.totalPolicyPremium || row.premiumQuote || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>{row.paymentUtr || "Pending UTR"}</TableCell>
                      <TableCell>{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.renewalStatus || (row.paymentUtr ? "Renewed" : "Pending")}
                          size="small"
                          color={row.renewalStatus === "Renewed" || row.paymentUtr ? "success" : "warning"}
                        />
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle fontSize="small" />}
                          onClick={() => onOpenPaymentUtr && onOpenPaymentUtr(row)}
                        >
                          {row.paymentUtr ? "View / Edit UTR" : "Enter UTR & Complete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceList);

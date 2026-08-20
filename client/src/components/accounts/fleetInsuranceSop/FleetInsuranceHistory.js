import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Chip,
  MenuItem,
  TextField,
  Autocomplete,
  Tabs,
  Tab,
  Divider,
  Stack
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import TimelineIcon from "@mui/icons-material/Timeline";
import TableChartIcon from "@mui/icons-material/TableChart";
import PolicyIcon from "@mui/icons-material/Policy";
import PaymentIcon from "@mui/icons-material/Payment";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";

function FleetInsuranceHistory({ registrationNo, onEdit, onRenew, onView, onBack }) {
  const { registrationNo: urlRegNo } = useParams();
  const navigate = useNavigate();
  const [activeRegNo, setActiveRegNo] = useState(registrationNo || urlRegNo || "");
  const [allVehicles, setAllVehicles] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [viewTab, setViewTab] = useState(0); // 0 = Timeline Cards, 1 = Comparison Table

  useEffect(() => {
    if (registrationNo) {
      setActiveRegNo(registrationNo);
    } else if (urlRegNo) {
      setActiveRegNo(urlRegNo);
    }
  }, [registrationNo, urlRegNo]);

  // Fetch list of all vehicles for selector dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/filters/options`);
        const regs = res.data.registrationNumbers || [];
        setAllVehicles(regs);
        if (!activeRegNo && regs.length > 0) {
          setActiveRegNo(regs[0]);
        }
      } catch (err) {
        console.error("Error fetching vehicle options:", err);
      }
    };
    fetchVehicles();
  }, []);

  // Fetch history for activeRegNo
  useEffect(() => {
    if (!activeRegNo) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/history/${encodeURIComponent(activeRegNo)}`
        );
        setHistory(res.data || []);
      } catch (error) {
        console.error("Failed to fetch history", error);
        toast.error("Failed to load vehicle policy history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activeRegNo]);

  const handleDelete = useCallback(async (record) => {
    if (!record?._id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this historical policy record (${record.registrationNo || "Vehicle"} - Policy No: ${record.policyNo || record.newPolicyNo || "N/A"})?`
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${record._id}`);
      toast.success("Policy record deleted successfully");
      setHistory((prev) => prev.filter((item) => item._id !== record._id));
    } catch (err) {
      console.error("Error deleting policy record:", err);
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  }, []);

  // Extract unique available years from policyFromDate and policyToDate
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    history.forEach((rec) => {
      if (rec.policyFromDate) {
        yearsSet.add(new Date(rec.policyFromDate).getFullYear().toString());
      }
      if (rec.policyToDate) {
        yearsSet.add(new Date(rec.policyToDate).getFullYear().toString());
      }
      if (rec.newPolicyToDate) {
        yearsSet.add(new Date(rec.newPolicyToDate).getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [history]);

  // Filter records by selected year
  const filteredHistory = useMemo(() => {
    if (selectedYear === "ALL") return history;
    return history.filter((rec) => {
      const fromY = rec.policyFromDate ? new Date(rec.policyFromDate).getFullYear().toString() : "";
      const toY = rec.policyToDate ? new Date(rec.policyToDate).getFullYear().toString() : "";
      const newToY = rec.newPolicyToDate ? new Date(rec.newPolicyToDate).getFullYear().toString() : "";
      return fromY === selectedYear || toY === selectedYear || newToY === selectedYear;
    });
  }, [history, selectedYear]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalRecords = history.length;
    const latestRec = history[0] || {};
    const totalPremiumPaid = history.reduce((acc, curr) => {
      const prem = curr.newTotalPolicyPremium || curr.totalPolicyPremium || curr.premiumAmount || curr.premium || 0;
      return acc + Number(prem);
    }, 0);

    const latestIdv = latestRec.newTotalIdv || latestRec.totalIdv || latestRec.idv || 0;

    // Status check of latest policy
    let latestStatus = "No Policy";
    let statusColor = "default";
    if (latestRec.policyToDate || latestRec.newPolicyToDate) {
      const expDate = new Date(latestRec.newPolicyToDate || latestRec.policyToDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        latestStatus = "Active";
        statusColor = "success";
      } else if (diffDays > 0) {
        latestStatus = `Expiring in ${diffDays}d`;
        statusColor = "warning";
      } else {
        latestStatus = "Expired";
        statusColor = "error";
      }
    }

    return { totalRecords, latestRec, totalPremiumPaid, latestIdv, latestStatus, statusColor };
  }, [history]);

  const getExpiryBadge = (dateString) => {
    if (!dateString) return <Chip label="No Expiry" size="small" variant="outlined" />;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateString);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return <Chip label="Expired" size="small" color="error" />;
    if (diffDays <= 30) return <Chip label={`Expiring (${diffDays} days)`} size="small" color="warning" />;
    return <Chip label="Active" size="small" color="success" />;
  };

  const vehicleInfo = history[0] || {};

  return (
    <Box sx={{ pb: 6 }}>
      {/* Top Header & Vehicle Switcher */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, backgroundColor: "#ffffff", boxShadow: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => onBack ? onBack() : navigate("/procurement-insurance-sops")} sx={{ backgroundColor: "#e8eaf6", "&:hover": { backgroundColor: "#c5cae9" } }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Multi-Year Policy History & Dashboard
              </Typography>
              <Typography variant="body2" color="textSecondary">
                View all historical policy renewals, premiums, and IDV trends across 5+ years
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Autocomplete
              size="small"
              options={allVehicles}
              value={activeRegNo || null}
              onChange={(event, newValue) => {
                if (newValue) setActiveRegNo(newValue);
              }}
              isOptionEqualToValue={(option, value) => option === value}
              sx={{ minWidth: 260 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Vehicle Reg No."
                  size="small"
                  placeholder="Type to search..."
                />
              )}
            />

            <Button
              variant="contained"
              color="primary"
              startIcon={<AutorenewIcon />}
              onClick={() => history.length > 0 && onRenew(history[0])}
              disabled={loading || history.length === 0}
              sx={{ boxShadow: 2, borderRadius: 2, px: 3, height: 40 }}
            >
              Renew Policy
            </Button>
          </Box>
        </Box>

        {vehicleInfo.registrationNo && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #e0e0e0", display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Typography variant="body2"><strong>Registration:</strong> {vehicleInfo.registrationNo}</Typography>
            {vehicleInfo.owner && <Typography variant="body2"><strong>Owner:</strong> {vehicleInfo.owner}</Typography>}
            {vehicleInfo.makeModel && <Typography variant="body2"><strong>Make/Model:</strong> {vehicleInfo.makeModel}</Typography>}
            {vehicleInfo.modelType && <Typography variant="body2"><strong>Type:</strong> {vehicleInfo.modelType}</Typography>}
            {vehicleInfo.size && <Typography variant="body2"><strong>Size:</strong> {vehicleInfo.size}</Typography>}
          </Box>
        )}
      </Paper>

      {/* KPI Cards Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, backgroundColor: "#f0f4f8" }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <PolicyIcon color="primary" fontSize="small" />
                <Typography variant="caption" color="textSecondary" fontWeight="bold">
                  TOTAL POLICY YEARS RECORDED
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {stats.totalRecords} {stats.totalRecords === 1 ? "Year" : "Years"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, backgroundColor: "#f8f9fa" }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <LocalShippingIcon color="action" fontSize="small" />
                <Typography variant="caption" color="textSecondary" fontWeight="bold">
                  LATEST ACTIVE STATUS
                </Typography>
              </Box>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={stats.latestStatus} color={stats.statusColor} fontWeight="bold" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, backgroundColor: "#e8f5e9" }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <PaymentIcon color="success" fontSize="small" />
                <Typography variant="caption" color="textSecondary" fontWeight="bold">
                  CUMULATIVE PREMIUM PAID
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                ₹ {stats.totalPremiumPaid.toLocaleString("en-IN")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, backgroundColor: "#fff8e1" }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <PolicyIcon color="warning" fontSize="small" />
                <Typography variant="caption" color="textSecondary" fontWeight="bold">
                  LATEST VEHICLE TOTAL IDV
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="warning.dark">
                ₹ {Number(stats.latestIdv).toLocaleString("en-IN")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and View Mode Controls */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FilterAltIcon color="primary" />
          <Typography variant="subtitle2" fontWeight="bold">
            Filter by Year:
          </Typography>
          <TextField
            select
            size="small"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">All Years ({history.length})</MenuItem>
            {availableYears.map((yr) => (
              <MenuItem key={yr} value={yr}>
                Year {yr}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Tabs value={viewTab} onChange={(e, val) => setViewTab(val)} indicatorColor="primary" textColor="primary">
          <Tab icon={<TimelineIcon />} iconPosition="start" label="Timeline Dashboard" />
          <Tab icon={<TableChartIcon />} iconPosition="start" label="Comparison Table" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredHistory.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="textSecondary">No policy records found for selected vehicle / year filter.</Typography>
        </Paper>
      ) : (
        <>
          {/* VIEW 1: TIMELINE DASHBOARD CARDS */}
          {viewTab === 0 && (
            <Stack spacing={3}>
              {filteredHistory.map((rec, index) => {
                const yearLabel = rec.policyFromDate
                  ? new Date(rec.policyFromDate).getFullYear()
                  : "N/A";
                const isLatest = index === 0;
                const nextRecord = index > 0 ? filteredHistory[index - 1] : null;

                const renewedInsurer = rec.newInsuranceCompany || (nextRecord ? nextRecord.insuranceCompany : "");
                const renewedPolicyNo = rec.newPolicyNo || (nextRecord ? nextRecord.policyNo : "");
                const renewedFromDate = rec.newPolicyFromDate || (nextRecord ? nextRecord.policyFromDate : "");
                const renewedToDate = rec.newPolicyToDate || (nextRecord ? nextRecord.policyToDate : "");
                const renewedIdv = (rec.newTotalIdv || rec.newIdv) || (nextRecord ? (nextRecord.totalIdv || nextRecord.idv) : 0);
                const renewedJackCover = (rec.newHydraulicJackCover || rec.newHydrolicJackCover) || (nextRecord ? (nextRecord.hydraulicJackCover || nextRecord.hydrolicJackCover) : 0);
                const renewedModeration = (rec.newModerationAmount || rec.newModerationAmountTipper) || (nextRecord ? (nextRecord.moderationAmount || nextRecord.moderationAmountTipper) : 0);
                const renewedTotalPremium = (rec.newTotalPolicyPremium || rec.newPremium) || (nextRecord ? (nextRecord.totalPolicyPremium || nextRecord.premiumAmount) : 0);

                const hasRenewedDetails = Boolean(renewedInsurer || renewedPolicyNo || renewedToDate);

                return (
                  <Paper
                    key={rec._id}
                    elevation={isLatest ? 3 : 1}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      borderLeft: isLatest ? "6px solid #1a237e" : "6px solid #9e9e9e",
                      backgroundColor: isLatest ? "#ffffff" : "#fafafa",
                    }}
                  >
                    {/* Header Row */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Chip
                          label={`Policy Year: ${yearLabel}`}
                          color={isLatest ? "primary" : "default"}
                          fontWeight="bold"
                        />
                        {isLatest && <Chip label="Latest Record" color="secondary" size="small" />}
                        {getExpiryBadge(rec.policyToDate || rec.newPolicyToDate)}
                      </Box>

                      <Box sx={{ display: "flex", gap: 1 }}>
                        {onView && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => onView(rec)}
                          >
                            View
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => onEdit(rec)}
                          >
                            Edit
                          </Button>
                        )}
                        {onRenew && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<AutorenewIcon />}
                            onClick={() => onRenew(rec)}
                          >
                            Renew from this Year
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDelete(rec)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={3}>
                      {/* Section 1: Previous Policy Details */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, backgroundColor: "#f8f9fa" }}>
                          <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                            Previous Policy Details
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Insurer</Typography>
                              <Typography variant="body2" fontWeight="bold">{rec.insuranceCompany || "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Policy No.</Typography>
                              <Typography variant="body2" fontWeight="bold">{rec.policyNo || "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Valid From</Typography>
                              <Typography variant="body2">{rec.policyFromDate ? new Date(rec.policyFromDate).toLocaleDateString("en-IN") : "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Valid To</Typography>
                              <Typography variant="body2">{rec.policyToDate ? new Date(rec.policyToDate).toLocaleDateString("en-IN") : "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Vehicle IDV</Typography>
                              <Typography variant="body2">₹ {(rec.idv || 0).toLocaleString("en-IN")}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Hydraulic Jack Cover</Typography>
                              <Typography variant="body2">₹ {(rec.hydraulicJackCover || rec.hydrolicJackCover || 0).toLocaleString("en-IN")}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Moderation Amount (Tipper)</Typography>
                              <Typography variant="body2">₹ {(rec.moderationAmount || rec.moderationAmountTipper || 0).toLocaleString("en-IN")}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Total Policy Premium</Typography>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                ₹ {(rec.totalPolicyPremium || rec.premiumAmount || rec.premium || 0).toLocaleString("en-IN")}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Section 2: Renewed Policy Details */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, backgroundColor: hasRenewedDetails ? "#e8f5e9" : "#fffde7" }}>
                          <Typography variant="subtitle2" fontWeight="bold" color={hasRenewedDetails ? "success.main" : "warning.dark"} gutterBottom>
                            Renewed Policy Details {hasRenewedDetails ? (nextRecord ? `(Renewed into Policy: ${renewedPolicyNo || "Next Cycle"})` : "(Completed)") : "(Pending / Draft)"}
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed Insurer</Typography>
                              <Typography variant="body2" fontWeight="bold">{renewedInsurer || "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed Policy No.</Typography>
                              <Typography variant="body2" fontWeight="bold">{renewedPolicyNo || "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed From</Typography>
                              <Typography variant="body2">{renewedFromDate ? new Date(renewedFromDate).toLocaleDateString("en-IN") : "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed To</Typography>
                              <Typography variant="body2">{renewedToDate ? new Date(renewedToDate).toLocaleDateString("en-IN") : "-"}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed Total IDV</Typography>
                              <Typography variant="body2">₹ {Number(renewedIdv || 0).toLocaleString("en-IN")}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed Hydraulic Jack</Typography>
                              <Typography variant="body2">₹ {Number(renewedJackCover || 0).toLocaleString("en-IN")}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed Moderation Amount</Typography>
                              <Typography variant="body2">₹ {Number(renewedModeration || 0).toLocaleString("en-IN")}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Renewed Total Premium</Typography>
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                ₹ {Number(renewedTotalPremium || 0).toLocaleString("en-IN")}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Section 3: Workflow Status */}
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", pt: 1 }}>
                          <Typography variant="caption"><strong>PR Number:</strong> {rec.prNumber || "N/A"}</Typography>
                          <Typography variant="caption"><strong>PR Date:</strong> {rec.prDate ? new Date(rec.prDate).toLocaleDateString("en-IN") : "N/A"}</Typography>
                          <Typography variant="caption"><strong>Financial Approval:</strong> {rec.financialApprovalStatus || "Draft"}</Typography>
                          <Typography variant="caption"><strong>Payment UTR:</strong> {rec.paymentUtr || "N/A"}</Typography>
                          <Typography variant="caption"><strong>Ready for PR:</strong> {rec.readyForPr || "No"}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* VIEW 2: MULTI-YEAR COMPARISON TABLE */}
          {viewTab === 1 && (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#1a237e" }}>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Year</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Insurer</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Policy No.</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Policy Period</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Total IDV (₹)</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Premium (₹)</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Renewed Insurer</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Renewed Premium (₹)</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>PR Number</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.map((row, idx) => {
                    const nxt = idx > 0 ? filteredHistory[idx - 1] : null;
                    const rIns = row.newInsuranceCompany || (nxt ? nxt.insuranceCompany : "-");
                    const rPrem = row.newTotalPolicyPremium || (nxt ? (nxt.totalPolicyPremium || nxt.premiumAmount) : null);
                    return (
                      <TableRow key={row._id} hover>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          {row.policyFromDate ? new Date(row.policyFromDate).getFullYear() : "-"}
                        </TableCell>
                        <TableCell>{row.insuranceCompany || "-"}</TableCell>
                        <TableCell>{row.policyNo || "-"}</TableCell>
                        <TableCell>
                          {row.policyFromDate ? new Date(row.policyFromDate).toLocaleDateString("en-IN") : "-"} to{" "}
                          {row.policyToDate ? new Date(row.policyToDate).toLocaleDateString("en-IN") : "-"}
                        </TableCell>
                        <TableCell>₹ {(row.totalIdv || row.idv || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          ₹ {(row.totalPolicyPremium || row.premiumAmount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>{rIns}</TableCell>
                        <TableCell sx={{ color: "success.main", fontWeight: "bold" }}>
                          {rPrem ? `₹ ${Number(rPrem).toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                        <TableCell>{row.prNumber || "-"}</TableCell>
                        <TableCell>{getExpiryBadge(row.policyToDate || row.newPolicyToDate)}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {onView && (
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => onView(row)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {onEdit && (
                            <Tooltip title="Edit Record">
                              <IconButton size="small" color="primary" onClick={() => onEdit(row)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {onRenew && (
                            <Tooltip title="Renew Policy">
                              <IconButton size="small" color="success" onClick={() => onRenew(row)}>
                                <AutorenewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete Record">
                            <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceHistory);

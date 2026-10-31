import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
  Avatar,
  MenuItem,
  InputAdornment,
  Stack,
} from "@mui/material";
import {
  Assessment,
  Clear,
  FileDownload,
  Search,
  FilterList,
  Storefront,
  Category,
  ViewList,
  Inventory,
  MonetizationOn,
} from "@mui/icons-material";

export default function ProcurementExcelReportModal({ open, onClose, defaultMonth = "", defaultYear = "2026" }) {
  const [periodType, setPeriodType] = useState(defaultMonth ? "month" : "all"); // "month" or "all"
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth || String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(defaultYear || String(new Date().getFullYear()));
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [groupBy, setGroupBy] = useState("vendor"); // "vendor" | "product" | "all"
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [reportData, setReportData] = useState({
    summary: { totalPRs: 0, totalBusinessVolume: 0, totalItemsQty: 0, vendorCount: 0, productCount: 0 },
    byVendor: [],
    byProduct: [],
    records: [],
  });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        month: periodType === "month" ? selectedMonth : "ALL",
        year: periodType === "month" ? selectedYear : "ALL",
        companyKey: selectedCompany,
        groupBy,
      };

      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/excel-report`, { params });
      if (res.data?.success) {
        setReportData({
          summary: res.data.summary || {},
          byVendor: res.data.byVendor || [],
          byProduct: res.data.byProduct || [],
          records: res.data.records || [],
        });
      }
    } catch (err) {
      console.error("Error fetching excel report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReport();
    }
  }, [open, periodType, selectedMonth, selectedYear, selectedCompany, groupBy]);

  // Filtered views based on search
  const filteredVendors = (reportData.byVendor || []).filter((v) =>
    search ? (v.vendorName || "").toLowerCase().includes(search.toLowerCase()) : true
  );

  const filteredProducts = (reportData.byProduct || []).filter((p) =>
    search ? (p.productName || "").toLowerCase().includes(search.toLowerCase()) : true
  );

  const filteredRecords = (reportData.records || []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.prNumber || "").toLowerCase().includes(q) ||
      (r.poNumber || "").toLowerCase().includes(q) ||
      (r.companyName || "").toLowerCase().includes(q) ||
      (r.stage2?.selectedSupplierL1 || "").toLowerCase().includes(q)
    );
  });

  const handleDownloadExcel = () => {
    try {
      setExporting(true);
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary KPI
      const summaryRows = [
        ["ALVISION PROCUREMENT - EXECUTIVE BUSINESS VOLUME REPORT"],
        [`Generated On: ${new Date().toLocaleString("en-GB")}`],
        [`Period: ${periodType === "month" ? `Month: ${selectedMonth} / Year: ${selectedYear}` : "All Time (Complete History)"}`],
        [`Company Filter: ${selectedCompany}`],
        [],
        ["Metric", "Value"],
        ["Total Purchase Requests (PRs)", reportData.summary.totalPRs || 0],
        ["Total Completed Business Volume (₹)", reportData.summary.totalBusinessVolume || 0],
        ["Total Item Quantities Procured", reportData.summary.totalItemsQty || 0],
        ["Total Unique Vendors Engaged", reportData.summary.vendorCount || 0],
        ["Total Product Categories", reportData.summary.productCount || 0],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Overview Summary");

      // Sheet 2: By Vendor Grouping
      const vendorHeader = ["Vendor Name", "POs Awarded", "Total Amount (₹)"];
      const vendorRows = [
        vendorHeader,
        ...reportData.byVendor.map((v) => [
          v.vendorName || "Unassigned",
          v.poCount || 0,
          v.totalAmount || 0,
        ]),
      ];
      const wsVendor = XLSX.utils.aoa_to_sheet(vendorRows);
      XLSX.utils.book_append_sheet(wb, wsVendor, "By Vendor Analysis");

      // Sheet 3: By Product Grouping
      const productHeader = ["Product Name / Category", "Total Qty Procured", "Est. Total Cost (₹)", "Orders Count"];
      const productRows = [
        productHeader,
        ...reportData.byProduct.map((p) => [
          p.productName || "General",
          p.totalQty || 0,
          p.totalEstimatedCost || 0,
          p.poCount || 0,
        ]),
      ];
      const wsProduct = XLSX.utils.aoa_to_sheet(productRows);
      XLSX.utils.book_append_sheet(wb, wsProduct, "By Product Analysis");

      // Sheet 4: Detailed Records Dump
      const recordHeader = ["PR Number", "PO Number", "Company", "Short Code", "PR Date", "Prepared By", "Awarded Supplier", "Total Value (₹)", "Status", "TAT (Days)"];
      const recordRows = [
        recordHeader,
        ...reportData.records.map((r) => [
          r.prNumber || "",
          r.poNumber || "-",
          r.companyName || "",
          r.companyShortName || "",
          r.stage1?.prDate ? new Date(r.stage1.prDate).toLocaleDateString("en-GB") : "",
          r.stage1?.preparedBy || "",
          r.stage2?.selectedSupplierL1 || "-",
          Number(r.stage2?.selectedSupplierL1Amount || r.stage1?.estimatedTotalCost || 0),
          r.status || "Draft",
          r.tatDays !== null && r.tatDays !== undefined ? r.tatDays : "-",
        ]),
      ];
      const wsRecords = XLSX.utils.aoa_to_sheet(recordRows);
      XLSX.utils.book_append_sheet(wb, wsRecords, "PR-PO-GRN Master Dump");

      const periodLabel = periodType === "month" ? `M${selectedMonth}_${selectedYear}` : "All_Time";
      XLSX.writeFile(wb, `Alvision_Procurement_Report_${periodLabel}.xlsx`);
    } catch (err) {
      console.error("Error generating excel report:", err);
      alert("Failed to download Excel report: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadBlankTemplate = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/template/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Procurement_SOP_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download blank template");
    }
  };

  const summary = reportData.summary || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#0f172a",
          color: "#ffffff",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: "#10b981", width: 36, height: 36 }}>
            <Assessment sx={{ fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#ffffff", letterSpacing: "0.2px" }}>
              Procurement Business Volume & Analytics Report
            </Typography>
            <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
              Comprehensive Excel report grouped by Vendor, Product Category, and Volume Analysis
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
          <Clear sx={{ fontSize: 19 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
        {/* Filter Controls Row */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: "8px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
          <Grid container spacing={2} alignItems="center">
            {/* Period Type: Month-wise vs All Time */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", mb: 0.5 }}>
                REPORT PERIOD
              </Typography>
              <TextField
                select
                size="small"
                fullWidth
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                sx={{ "& .MuiOutlinedInput-root": { height: 36, fontSize: "12.5px", fontWeight: 600 } }}
              >
                <MenuItem value="month">Month-wise Report</MenuItem>
                <MenuItem value="all">All Time (Complete History)</MenuItem>
              </TextField>
            </Grid>

            {/* Month & Year Selectors (if Month-wise) */}
            {periodType === "month" && (
              <>
                <Grid item xs={6} sm={3} md={2}>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", mb: 0.5 }}>
                    MONTH
                  </Typography>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { height: 36, fontSize: "12.5px", fontWeight: 600 } }}
                  >
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
                </Grid>

                <Grid item xs={6} sm={3} md={1.5}>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", mb: 0.5 }}>
                    YEAR
                  </Typography>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    sx={{ "& .MuiOutlinedInput-root": { height: 36, fontSize: "12.5px", fontWeight: 600 } }}
                  >
                    <MenuItem value="2027">2027</MenuItem>
                    <MenuItem value="2026">2026</MenuItem>
                    <MenuItem value="2025">2025</MenuItem>
                    <MenuItem value="2024">2024</MenuItem>
                  </TextField>
                </Grid>
              </>
            )}

            {/* Company Filter */}
            <Grid item xs={12} sm={6} md={periodType === "month" ? 2.5 : 4}>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", mb: 0.5 }}>
                COMPANY ENTITY
              </Typography>
              <TextField
                select
                size="small"
                fullWidth
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                sx={{ "& .MuiOutlinedInput-root": { height: 36, fontSize: "12.5px", fontWeight: 600 } }}
              >
                <MenuItem value="ALL">All Companies</MenuItem>
                <MenuItem value="SURAVIO">SURAVIO CARGO (SRCC)</MenuItem>
                <MenuItem value="SURAJ">SURAJ FORWARDERS (SFPL)</MenuItem>
                <MenuItem value="NOVUSHA">NOVUSHA CONSULTING (NCS)</MenuItem>
                <MenuItem value="ALLUVIUM">ALLUVIUM IOT (AISPL)</MenuItem>
                <MenuItem value="PARAMOUNT">PARAMOUNT PROPACK (PPPL)</MenuItem>
                <MenuItem value="RABS">RABS INDUSTRIES (RABS)</MenuItem>
              </TextField>
            </Grid>

            {/* Live Search */}
            <Grid item xs={12} sm={6} md={periodType === "month" ? 3 : 5}>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", mb: 0.5 }}>
                SEARCH IN REPORT
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Search vendor, product, PR#..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 18, color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch("")}>
                        <Clear sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ "& .MuiOutlinedInput-root": { height: 36, fontSize: "12.5px" } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* 4 Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, borderRadius: "8px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>TOTAL PRs</Typography>
              <Typography sx={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", mt: 0.3 }}>
                {summary.totalPRs || 0}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, borderRadius: "8px", border: "1px solid #bbf7d0", bgcolor: "#f0fdf4" }}>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#15803d" }}>COMPLETED VOLUME</Typography>
              <Typography sx={{ fontSize: "20px", fontWeight: 800, color: "#166534", mt: 0.3 }}>
                {(summary.totalBusinessVolume || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, borderRadius: "8px", border: "1px solid #e0e7ff", bgcolor: "#eef2ff" }}>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#4338ca" }}>ITEMS PROCURED</Typography>
              <Typography sx={{ fontSize: "22px", fontWeight: 800, color: "#3730a3", mt: 0.3 }}>
                {summary.totalItemsQty || 0} Qty
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, borderRadius: "8px", border: "1px solid #fed7aa", bgcolor: "#fff7ed" }}>
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#c2410c" }}>VENDORS ENGAGED</Typography>
              <Typography sx={{ fontSize: "22px", fontWeight: 800, color: "#9a3412", mt: 0.3 }}>
                {summary.vendorCount || 0}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Grouping View Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={groupBy}
            onChange={(e, val) => setGroupBy(val)}
            sx={{
              minHeight: 38,
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "13px", minHeight: 38, py: 0.8 },
            }}
          >
            <Tab value="vendor" icon={<Storefront sx={{ fontSize: 17 }} />} iconPosition="start" label={`Grouped by Vendor (${filteredVendors.length})`} />
            <Tab value="product" icon={<Category sx={{ fontSize: 17 }} />} iconPosition="start" label={`Grouped by Product (${filteredProducts.length})`} />
            <Tab value="all" icon={<ViewList sx={{ fontSize: 17 }} />} iconPosition="start" label={`Detailed PRs List (${filteredRecords.length})`} />
          </Tabs>
        </Box>

        {/* Data Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: "8px", maxHeight: 380 }}>
            {groupBy === "vendor" && (
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Vendor / Supplier Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "12px" }}>Awarded POs</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "12px" }}>Total Volume (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#64748b", fontSize: "12.5px" }}>
                        No vendor records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendors.map((v, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 700, fontSize: "12.5px", color: "#1e293b" }}>
                          {v.vendorName || "Pending Assignment"}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: "12px", fontWeight: 600 }}>
                          <Chip label={`${v.poCount} PO${v.poCount !== 1 ? "s" : ""}`} size="small" color="primary" sx={{ fontSize: "11px", fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: "13px", color: "#047857" }}>
                          {(v.totalAmount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {groupBy === "product" && (
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Product Name / Category</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "12px" }}>Total Qty Procured</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "12px" }}>Est. Total Value (₹)</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "12px" }}>PR Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#64748b", fontSize: "12.5px" }}>
                        No product records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 700, fontSize: "12.5px", color: "#1e293b" }}>
                          {p.productName}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: "12.5px", fontWeight: 700, color: "#2563eb" }}>
                          {p.totalQty}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, fontSize: "13px", color: "#047857" }}>
                          {(p.totalEstimatedCost || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: "12px" }}>
                          {p.poCount}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {groupBy === "all" && (
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PR Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PO Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Supplier</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "12px" }}>Total Amount (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>TAT (Days)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: "#64748b", fontSize: "12.5px" }}>
                        No PR records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((r, idx) => {
                      const amt = Number(r.stage2?.selectedSupplierL1Amount || r.stage1?.estimatedTotalCost || 0);
                      return (
                        <TableRow key={r._id || idx} hover>
                          <TableCell sx={{ fontWeight: 700, fontSize: "12px", color: "#2563eb" }}>
                            {r.prNumber}
                          </TableCell>
                          <TableCell sx={{ fontSize: "12px", color: "#7c3aed", fontWeight: 600 }}>
                            {r.poNumber || "-"}
                          </TableCell>
                          <TableCell sx={{ fontSize: "12px" }}>
                            {r.companyShortName || r.companyName || "-"}
                          </TableCell>
                          <TableCell sx={{ fontSize: "12px" }}>
                            {r.stage2?.selectedSupplierL1 || "-"}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: "12.5px", color: "#0f172a" }}>
                            {amt.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </TableCell>
                          <TableCell>
                            <Chip label={r.status || "Draft"} size="small" sx={{ fontSize: "10.5px", fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: "12px", fontWeight: 600, color: r.tatDays ? "#047857" : "#94a3b8" }}>
                            {r.tatDays !== null && r.tatDays !== undefined ? `${r.tatDays} days` : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
        <Button
          onClick={handleDownloadBlankTemplate}
          sx={{ textTransform: "none", fontSize: "12px", color: "#64748b" }}
        >
          Download Blank SOP Template
        </Button>

        <Stack direction="row" spacing={1.5}>
          <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>
            Close
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <FileDownload sx={{ fontSize: 18 }} />}
            onClick={handleDownloadExcel}
            disabled={exporting}
            sx={{
              fontWeight: 700,
              fontSize: "13px",
              textTransform: "none",
              px: 2.5,
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
            }}
          >
            {exporting ? "Generating Excel..." : "Download Full Excel Report (.xlsx)"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CalculateIcon from "@mui/icons-material/Calculate";

// Helper to safely parse numeric values
const parseNum = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

// Helper to format currency values cleanly
const fmtINR = (val) => {
  if (val === "" || val === null || val === undefined) return "—";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return val;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtVal = (val, isRate = false) => {
  if (val === "" || val === null || val === undefined) return "—";
  if (isRate && !isNaN(parseFloat(val))) return `${parseFloat(val)}%`;
  return val;
};

// Generic Duty Matrix Table for Sections B, C, D
const DutyMatrixTable = ({ sectionTitle, sectionCode, columns, dutyData }) => {
  const rowHeaders = [
    { label: "Notification No.", key: "NOTN_NO", hint: "Government exemption / tariff notification" },
    { label: "Notification Sr No.", key: "NOTN_SNO", hint: "Serial number within notification" },
    { label: "Rate", key: "RATE", isRate: true, hint: "Duty rate percentage or specific rate" },
    { label: "Duty Amount (INR)", key: "AMOUNT", isCurrency: true, hint: "Total calculated duty amount" },
    { label: "Duty Flag / Specific", key: "DUTY_FG", hint: "Exemption flag or specific assessment base" }
  ];

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase", fontSize: "0.82rem" }}
        >
          {sectionCode}. {sectionTitle}
        </Typography>
      </Box>

      <Box sx={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", background: "#ffffff" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  color: "#334155",
                  fontWeight: 700,
                  width: "160px",
                  minWidth: "140px"
                }}
              >
                Duty Parameter
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    color: "#0f172a",
                    fontWeight: 700,
                    borderLeft: "1px solid #e2e8f0",
                    minWidth: "95px"
                  }}
                >
                  <Tooltip title={col.tooltip || col.code} arrow>
                    <span>{col.code}</span>
                  </Tooltip>
                  {col.sub && (
                    <div style={{ fontSize: "10px", fontWeight: 500, color: "#64748b" }}>
                      {col.sub}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowHeaders.map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  background: rIdx % 2 === 0 ? "#ffffff" : "#f8fafc",
                  borderBottom: "1px solid #e2e8f0"
                }}
              >
                <td style={{ padding: "6px 10px", fontWeight: 600, color: "#475569" }}>
                  <Tooltip title={row.hint} placement="top" arrow>
                    <span style={{ cursor: "help" }}>{row.label}</span>
                  </Tooltip>
                </td>
                {columns.map((col, cIdx) => {
                  const cellObj = dutyData?.[col.key] || {};
                  const rawVal = cellObj[row.key];
                  const hasValue = rawVal !== "" && rawVal !== undefined && rawVal !== null;

                  return (
                    <td
                      key={cIdx}
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        borderLeft: "1px solid #e2e8f0",
                        color: hasValue
                          ? row.isCurrency && parseFloat(rawVal) > 0
                            ? "#1d4ed8"
                            : "#0f172a"
                          : "#94a3b8",
                        fontWeight: hasValue && (row.isCurrency || row.key === "RATE") ? 700 : 500
                      }}
                    >
                      {row.isCurrency ? fmtINR(rawVal) : fmtVal(rawVal, row.isRate)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
};

export default function BoePartIIIDutyTable({
  duties: initialDuties = [],
  candidateFiles = [],
  onUploadSuccess,
  showUploader = true
}) {
  const [dutiesList, setDutiesList] = useState(initialDuties);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedFileUrl, setSelectedFileUrl] = useState("");

  // Sync state if initialDuties prop updates
  useEffect(() => {
    if (initialDuties && initialDuties.length > 0) {
      setDutiesList(initialDuties);
    }
  }, [initialDuties]);

  // Set default selected file from candidates
  useEffect(() => {
    if (candidateFiles && candidateFiles.length > 0 && !selectedFileUrl) {
      setSelectedFileUrl(candidateFiles[0].url);
    }
  }, [candidateFiles, selectedFileUrl]);

  // Helper to send a File/Blob to the OCR API
  const API_BASE = process.env.REACT_APP_API_STRING || "";

  // Sync from Job's existing attached BOE file via S3 URL
  const handleSyncFromJobFile = async () => {
    if (!selectedFileUrl) {
      setErrorMsg("Please select a Bill of Entry file to sync.");
      return;
    }

    setSyncing(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Find candidate object for display name
      const matched = candidateFiles.find((f) => f.url === selectedFileUrl);
      const fileName = matched?.name || selectedFileUrl.split("/").pop().split("?")[0] || "bill_of_entry.pdf";

      const response = await axios.post(`${API_BASE}/import-dsr/boe-ocr`, {
        fileUrl: selectedFileUrl
      });

      if (response.data && response.data.status === "success") {
        const extractedDuties = response.data.data?.PartIIIDuties || [];
        setDutiesList(extractedDuties);
        setSuccessMsg(`Successfully synced & extracted duties for ${extractedDuties.length} product(s) from "${fileName}".`);
        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
      } else {
        setErrorMsg(response.data?.message || "Failed to parse Bill of Entry file.");
      }
    } catch (err) {
      console.error("BOE OCR sync error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Error communicating with BOE OCR Service.");
    } finally {
      setSyncing(false);
    }
  };

  // Fallback direct upload from user's computer
  const handleManualUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSyncing(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", file, file.name || "bill_of_entry.pdf");

    try {
      const response = await axios.post(`${API_BASE}/import-dsr/boe-ocr`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          accept: "application/json"
        }
      });

      if (response.data && response.data.status === "success") {
        const extractedDuties = response.data.data?.PartIIIDuties || [];
        setDutiesList(extractedDuties);
        setSuccessMsg(`Successfully synced & extracted duties for ${extractedDuties.length} product(s) from "${file.name}".`);
        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
      } else {
        setErrorMsg(response.data?.message || "Failed to parse Bill of Entry file.");
      }
    } catch (err) {
      console.error("BOE OCR manual upload error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Error communicating with BOE OCR Service.");
    } finally {
      setSyncing(false);
    }
  };

  // Column Configurations matching ICEGATE BOE format
  const itemDutyCols = [
    { code: "1. BCD", key: "BCD", sub: "Basic Customs", tooltip: "Basic Customs Duty" },
    { code: "2. CVD_05", key: "CVD_05", sub: "Countervailing", tooltip: "CVD 05%" },
    { code: "3. SWS", key: "SWS", sub: "SW Surcharge", tooltip: "Social Welfare Surcharge" },
    { code: "4. SAD", key: "SAD", sub: "Special Addl", tooltip: "Special Additional Duty" },
    { code: "5. IGST", key: "IGST", sub: "Integrated GST", tooltip: "Integrated Goods and Services Tax" },
    { code: "6. G. CESS", key: "G. CESS", sub: "GST Cess", tooltip: "Compensation Cess" },
    { code: "7. ADD", key: "ADD", sub: "Anti-Dumping", tooltip: "Anti-Dumping Duty" },
    { code: "8. CVD", key: "CVD", sub: "Excise CVD", tooltip: "Countervailing Duty" },
    { code: "9. SG", key: "SG", sub: "Safeguard", tooltip: "Safeguard Duty" },
    { code: "10. T. VAL", key: "T. VALUE", sub: "Tariff Value", tooltip: "Tariff Value Assessment" }
  ];

  const otherDutiesCols = [
    { code: "1. SP EXD", key: "SP EXD", sub: "Special Excise", tooltip: "Special Excise Duty" },
    { code: "2. CHCESS", key: "CHCESS", sub: "Cess on Coal", tooltip: "Clean Energy Cess" },
    { code: "3. TTA", key: "TTA", sub: "Textile Cess", tooltip: "Textile Additional Duty" },
    { code: "4. CESS", key: "CESS", sub: "General Cess", tooltip: "Customs Cess" },
    { code: "5. CAIDC", key: "CAIDC", sub: "Customs AIDC", tooltip: "Agriculture Infrastructure & Development Cess (Customs)" },
    { code: "6. EAIDC", key: "EAIDC", sub: "Excise AIDC", tooltip: "AIDC (Excise)" },
    { code: "7. CUS EDC", key: "CUS EDC", sub: "Customs Ed Cess", tooltip: "Customs Education Cess" },
    { code: "8. CUS HEC", key: "CUS HEC", sub: "Higher Ed Cess", tooltip: "Customs Higher Education Cess" },
    { code: "9. NCD", key: "NCD", sub: "National Calamity", tooltip: "National Calamity Contingent Duty" },
    { code: "10. AGGR", key: "AGGR", sub: "Aggregate", tooltip: "Aggregate Duty" }
  ];

  const otherDutiesACols = [
    { code: "1. OTHCUS", key: "OTHCUS", sub: "Other Customs", tooltip: "Other Customs Duty" },
    { code: "2. OTHCVD", key: "OTHCVD", sub: "Other CVD", tooltip: "Other Countervailing Duty" },
    { code: "3. PETR CUS", key: "PETR CUS", sub: "Petroleum Cess", tooltip: "Petroleum Customs Duty" },
    { code: "4. INFRA CES", key: "INFRA CES", sub: "Infrastructure", tooltip: "Infrastructure Cess" },
    { code: "5. CUS CVD", key: "CUS CVD", sub: "Customs CVD", tooltip: "Customs CVD" }
  ];

  const hasAttachedFiles = candidateFiles && candidateFiles.length > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Top Sync / Action Header */}
      {showUploader && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: hasAttachedFiles ? "1.5px solid #2563eb" : "1px dashed #94a3b8",
            borderRadius: "8px",
            background: hasAttachedFiles ? "#eff6ff" : "#f8fafc",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
            gap: 2
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
            <PictureAsPdfIcon sx={{ fontSize: 40, color: hasAttachedFiles ? "#dc2626" : "#94a3b8" }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
                <span>Bill of Entry Duties (Part-III Sync)</span>
                {hasAttachedFiles && (
                  <Chip
                    size="small"
                    label={`${candidateFiles.length} File(s) Available`}
                    color="primary"
                    sx={{ fontSize: "0.75rem", height: "22px" }}
                  />
                )}
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", mt: 0.2 }}>
                {hasAttachedFiles
                  ? "Bill of Entry document detected from this job. Click Sync to fetch and extract duties automatically."
                  : "No Bill of Entry document currently attached to this job. You can upload a PDF directly below."}
              </Typography>
            </Box>
          </Box>

          {/* Sync / Upload Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            {hasAttachedFiles ? (
              <>
                {candidateFiles.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel id="select-boe-file-label">Select Document</InputLabel>
                    <Select
                      labelId="select-boe-file-label"
                      value={selectedFileUrl}
                      label="Select Document"
                      onChange={(e) => setSelectedFileUrl(e.target.value)}
                      disabled={syncing}
                      sx={{ background: "#ffffff" }}
                    >
                      {candidateFiles.map((file, idx) => (
                        <MenuItem key={idx} value={file.url}>
                          [{file.source}] {file.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Button
                  variant="contained"
                  onClick={handleSyncFromJobFile}
                  disabled={syncing}
                  startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
                  sx={{
                    background: "#2563eb",
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2.5,
                    py: 1,
                    boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                    "&:hover": { background: "#1d4ed8" }
                  }}
                >
                  {syncing ? "Syncing Duties..." : "Sync Duties from BOE File"}
                </Button>
              </>
            ) : null}

            {/* Fallback Upload Button */}
            <input
              accept="application/pdf"
              style={{ display: "none" }}
              id="boe-manual-upload-input"
              type="file"
              onChange={handleManualUpload}
              disabled={syncing}
            />
            <label htmlFor="boe-manual-upload-input">
              <Button
                variant={hasAttachedFiles ? "outlined" : "contained"}
                component="span"
                disabled={syncing}
                startIcon={syncing && !hasAttachedFiles ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                  background: hasAttachedFiles ? "#ffffff" : "#1e293b",
                  color: hasAttachedFiles ? "#1e293b" : "#ffffff",
                  borderColor: "#cbd5e1",
                  "&:hover": {
                    background: hasAttachedFiles ? "#f1f5f9" : "#0f172a",
                    borderColor: "#94a3b8"
                  }
                }}
              >
                {hasAttachedFiles ? "Upload Different PDF" : (syncing ? "Extracting..." : "Upload BOE PDF")}
              </Button>
            </label>
          </Box>
        </Paper>
      )}

      {/* Status Messages */}
      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" icon={<CheckCircleIcon />} onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      )}

      {/* Empty State */}
      {(!dutiesList || dutiesList.length === 0) && !syncing && (
        <Box sx={{ p: 4, textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#334155" }}>
            No Duty Breakdown Loaded
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
            {hasAttachedFiles
              ? 'Click "Sync Duties from BOE File" above to fetch and display the full Part III duty breakdown.'
              : "Upload a Bill of Entry PDF above to extract and view Part III Duties per product."}
          </Typography>
        </Box>
      )}

      {/* Product Cards List with Top Aggregate Summary */}
      {dutiesList && dutiesList.length > 0 && (() => {
        // Calculate cumulative totals across all products
        const totalAssessableValue = dutiesList.reduce((sum, item) => {
          const d = item?.ItemDetails || {};
          const val = d["ASSESS VALUE"] ?? d["ASSESS_VALUE"] ?? d.assess_value ?? d.assessValue;
          return sum + parseNum(val);
        }, 0);

        const totalProductDuty = dutiesList.reduce((sum, item) => {
          const d = item?.ItemDetails || {};
          const val = d["TOTAL DUTY"] ?? d["TOTAL_DUTY"] ?? d.total_duty ?? d.totalDuty;
          return sum + parseNum(val);
        }, 0);

        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
            {/* Top Cumulative Summary Banner */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: "8px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                border: "1px solid #334155",
                color: "#ffffff",
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "stretch", md: "center" },
                justifyContent: "space-between",
                gap: 2,
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
                    flexShrink: 0
                  }}
                >
                  <CalculateIcon sx={{ fontSize: 26, color: "#ffffff" }} />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="h6" sx={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
                      Total Duties & Assessable Value Summary
                    </Typography>
                    <Chip
                      size="small"
                      label={`${dutiesList.length} ${dutiesList.length === 1 ? "Product" : "Products"}`}
                      sx={{
                        background: "rgba(56, 189, 248, 0.15)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        height: "22px"
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.3, fontSize: "0.85rem" }}>
                    Cumulative sum of all product assessable values and total duties
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                {/* Total Assessable Value */}
                <Box
                  sx={{
                    background: "rgba(255, 255, 255, 0.08)",
                    px: 2.5,
                    py: 1,
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    minWidth: { xs: "100%", sm: "180px" },
                    textAlign: { xs: "left", sm: "right" },
                    flex: { xs: 1, md: "initial" }
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#94a3b8",
                      display: "block",
                      textTransform: "uppercase",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      letterSpacing: "0.05em"
                    }}
                  >
                    Total Assessable Value (CIF)
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#38bdf8", mt: 0.2, fontSize: "1.15rem" }}>
                    {fmtINR(totalAssessableValue)}
                  </Typography>
                </Box>

                {/* Total Product Duty */}
                <Box
                  sx={{
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    px: 2.5,
                    py: 1,
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    minWidth: { xs: "100%", sm: "180px" },
                    textAlign: { xs: "left", sm: "right" },
                    boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
                    flex: { xs: 1, md: "initial" }
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#bfdbfe",
                      display: "block",
                      textTransform: "uppercase",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      letterSpacing: "0.05em"
                    }}
                  >
                    Total Product Duty
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#ffffff", mt: 0.2, fontSize: "1.15rem" }}>
                    {fmtINR(totalProductDuty)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Individual Product Cards */}
            {dutiesList.map((item, index) => {
              const d = item.ItemDetails || {};
              const itemDuty = item.ItemDuty || {};
              const otherDuties = item.OtherDuties || {};
              const otherDutiesA = item.OtherDutiesA || {};

              return (
                <Card
                  key={index}
                sx={{
                  border: "1px solid #94a3b8",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  overflow: "hidden"
                }}
              >
                {/* Top Product Banner */}
                <Box
                  sx={{
                    background: "linear-gradient(90deg, #1e293b 0%, #0f172a 100%)",
                    color: "#ffffff",
                    px: 2.5,
                    py: 1.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2
                  }}
                >
                  <div>
                    <Typography
                      variant="h6"
                      sx={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <span>Product #{d.ITEMSN || index + 1}:</span>
                      <span style={{ color: "#38bdf8" }}>{d["ITEM DESCRIPTION"] || "N/A"}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8", display: "flex", gap: 2, mt: 0.5 }}>
                      <span>Invoice Sr: <strong>{d.INVSNO || "1"}</strong></span>
                      <span>RITC/CTH: <strong>{d.CTH || "N/A"}</strong></span>
                      <span>Quantity: <strong>{d["C.QTY"] || 0} {d["C.UQC"] || ""}</strong></span>
                    </Typography>
                  </div>

                  {/* Financial Highlight Pills */}
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <Box
                      sx={{
                        background: "rgba(255,255,255,0.08)",
                        px: 2,
                        py: 0.8,
                        borderRadius: 1.5,
                        border: "1px solid rgba(255,255,255,0.15)",
                        textAlign: "right"
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#94a3b8", display: "block", textTransform: "uppercase", fontSize: "10px", fontWeight: 600 }}
                      >
                        Assessable Value (CIF)
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#ffffff" }}>
                        {fmtINR(d["ASSESS VALUE"])}
                      </Typography>
                    </Box>
                    <Box sx={{ background: "#2563eb", px: 2, py: 0.8, borderRadius: 1.5, textAlign: "right" }}>
                      <Typography
                        variant="caption"
                        sx={{ color: "#bfdbfe", display: "block", textTransform: "uppercase", fontSize: "10px", fontWeight: 600 }}
                      >
                        Total Product Duty
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#ffffff" }}>
                        {fmtINR(d["TOTAL DUTY"])}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <CardContent sx={{ p: 2.5 }}>
                  {/* SECTION A: ITEM DETAILS */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase", fontSize: "0.82rem", mb: 1 }}
                    >
                      A. Item Details & Classification
                    </Typography>

                    <Box sx={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", background: "#ffffff" }}>
                        <thead>
                          <tr style={{ background: "#e0f2fe", borderBottom: "1px solid #90cdf4" }}>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>1. INVSNO</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>2. ITEMSN</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>3. CTH</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>4. CETH</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>11. UPI (Price)</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>12. COO</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>13. Qty / UQC</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>15. Std Qty / UQC</th>
                            <th style={{ padding: "6px 8px", textAlign: "center" }}>18. Standard/Pref</th>
                            <th style={{ padding: "6px 8px", textAlign: "right" }}>29. Assess Value</th>
                            <th style={{ padding: "6px 8px", textAlign: "right" }}>30. Total Duty</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px" }}>{d.INVSNO || "1"}</td>
                            <td style={{ padding: "8px" }}>{d.ITEMSN || "1"}</td>
                            <td style={{ padding: "8px", fontWeight: 700, color: "#0f172a" }}>{d.CTH || "—"}</td>
                            <td style={{ padding: "8px" }}>{d.CETH || "NOEXCISE"}</td>
                            <td style={{ padding: "8px" }}>{d.UPI || "—"}</td>
                            <td style={{ padding: "8px", fontWeight: 600 }}>{d.COO || "—"}</td>
                            <td style={{ padding: "8px" }}>{d["C.QTY"]} {d["C.UQC"]}</td>
                            <td style={{ padding: "8px" }}>{d["S.QTY"]} {d["S.UQC"]}</td>
                            <td style={{ padding: "8px" }}>{d["STND/PR"] === "S" ? "Standard (S)" : (d["STND/PR"] || "—")}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>{fmtINR(d["ASSESS VALUE"])}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: 800, color: "#2563eb" }}>{fmtINR(d["TOTAL DUTY"])}</td>
                          </tr>
                        </tbody>
                      </table>
                    </Box>

                    {/* Additional Compliance Badges */}
                    <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b" }}>Compliance & Declarations:</Typography>
                      <Chip size="small" label={`FS: ${d.FS || "N"}`} variant="outlined" />
                      <Chip size="small" label={`PQ: ${d.PQ || "N"}`} variant="outlined" />
                      <Chip size="small" label={`AQ: ${d.AQ || "N"}`} variant="outlined" />
                      <Chip size="small" label={`DC: ${d.DC || "N"}`} variant="outlined" />
                      <Chip size="small" label={`WC: ${d.WC || "N"}`} variant="outlined" />
                      <Chip size="small" label={`End Use: ${d["END USE"] || "N/A"}`} color="primary" variant="outlined" />
                    </Box>
                  </Box>

                  {/* SECTION B: ITEM DUTY */}
                  <DutyMatrixTable
                    sectionCode="B"
                    sectionTitle="Item Duty (BCD, SWS, IGST, Cess)"
                    columns={itemDutyCols}
                    dutyData={itemDuty}
                  />

                  {/* SECTION C: OTHER DUTIES */}
                  <DutyMatrixTable
                    sectionCode="C"
                    sectionTitle="Other Duties (AIDC, Education Cess, NCD)"
                    columns={otherDutiesCols}
                    dutyData={otherDuties}
                  />

                  {/* SECTION D: OTHER DUTIES - A */}
                  <DutyMatrixTable
                    sectionCode="D"
                    sectionTitle="Other Duties - A (Infrastructure, Petroleum)"
                    columns={otherDutiesACols}
                    dutyData={otherDutiesA}
                  />
                </CardContent>
              </Card>
            );
          })}
        </Box>
        );
      })()}
    </Box>
  );
}

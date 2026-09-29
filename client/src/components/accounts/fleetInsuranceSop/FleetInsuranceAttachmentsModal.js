import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  Paper,
  Chip,
  Stack,
  CircularProgress,
  Tooltip,
  TextField,
  MenuItem,
  Divider,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Close,
  AttachFile,
  PictureAsPdf,
  CloudUpload,
  Download,
  Visibility,
  Delete,
  CalendarToday,
  Business,
  LocalShipping,
  CheckCircle,
  InsertDriveFile,
} from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-hot-toast";
import { uploadFileToS3 } from "../../../utils/awsFileUpload";

export default function FleetInsuranceAttachmentsModal({
  open,
  onClose,
  vehicleRecord,
  onUpdated,
}) {
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [selectedYearTab, setSelectedYearTab] = useState("ALL");
  const [uploading, setUploading] = useState(false);

  // New attachment form state
  const currentYear = new Date().getFullYear();
  const [formYear, setFormYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [customYear, setCustomYear] = useState("");
  const [docType, setDocType] = useState("Policy Copy");
  const [docName, setDocName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const regNo = vehicleRecord?.registrationNo || "";
  const recordId = vehicleRecord?._id || "";

  // Fetch all year-wise attachments for this vehicle
  const fetchAttachments = useCallback(async () => {
    if (!regNo) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/vehicle-attachments/${encodeURIComponent(regNo)}`
      );
      setAttachments(res.data?.attachments || []);
    } catch (err) {
      console.error("Error fetching vehicle attachments:", err);
      toast.error("Failed to load vehicle attachments");
    } finally {
      setLoading(false);
    }
  }, [regNo]);

  useEffect(() => {
    if (open && regNo) {
      fetchAttachments();
      setSelectedYearTab("ALL");
      setSelectedFile(null);
      setDocName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, regNo, fetchAttachments]);

  // Derive distinct years present in attachments for tabs
  const availableYears = React.useMemo(() => {
    const yearsSet = new Set();
    attachments.forEach((a) => {
      if (a.year) yearsSet.add(a.year);
    });
    return Array.from(yearsSet).sort((a, b) => {
      const numA = parseInt(String(a).replace(/\D/g, "").slice(0, 4), 10) || 0;
      const numB = parseInt(String(b).replace(/\D/g, "").slice(0, 4), 10) || 0;
      return numB - numA;
    });
  }, [attachments]);

  // Filter attachments by selected year tab
  const filteredAttachments = React.useMemo(() => {
    if (selectedYearTab === "ALL") return attachments;
    return attachments.filter((a) => a.year === selectedYearTab);
  }, [attachments, selectedYearTab]);

  // Group filtered attachments by year
  const groupedByYear = React.useMemo(() => {
    const groups = {};
    filteredAttachments.forEach((att) => {
      const yr = att.year || "General";
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(att);
    });
    return groups;
  }, [filteredAttachments]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit.");
      return;
    }

    setSelectedFile(file);
    if (!docName) {
      setDocName(file.name);
    }
  };

  const handleUploadAndSave = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!recordId) {
      toast.error("Vehicle record ID missing");
      return;
    }

    const effectiveYear = formYear === "CUSTOM" ? customYear.trim() : formYear;
    if (!effectiveYear) {
      toast.error("Please specify a policy year for this attachment");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadFileToS3(selectedFile, "fleet-insurance");
      const fileUrl = res?.Location;
      if (!fileUrl) {
        throw new Error("S3 upload failed");
      }

      await axios.post(
        `${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${recordId}/attachments`,
        {
          year: effectiveYear,
          docType,
          name: docName.trim() || selectedFile.name,
          url: fileUrl,
        }
      );

      toast.success(`Attachment saved for Year ${effectiveYear}`);
      setSelectedFile(null);
      setDocName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchAttachments();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error saving attachment:", err);
      toast.error(err.response?.data?.message || "Failed to save attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (att) => {
    if (!window.confirm(`Are you sure you want to delete "${att.name || "this document"}"?`)) {
      return;
    }

    try {
      const targetRecId = att.recordId || recordId;
      await axios.delete(
        `${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${targetRecId}/attachments/${att._id}`
      );
      toast.success("Attachment deleted successfully");
      await fetchAttachments();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error deleting attachment:", err);
      toast.error(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "10px" } }}>
      {/* Modal Header */}
      <DialogTitle
        sx={{
          bgcolor: "#0f172a",
          color: "#ffffff",
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: "rgba(59, 130, 246, 0.2)",
              p: 0.8,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PictureAsPdf sx={{ color: "#60a5fa", fontSize: 24 }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#ffffff" }}>
                {regNo}
              </Typography>
              <Chip
                label="Year-Wise Policy Attachments"
                size="small"
                sx={{
                  bgcolor: "rgba(59, 130, 246, 0.2)",
                  color: "#93c5fd",
                  fontWeight: 700,
                  fontSize: "11px",
                  height: 20,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: "12px", color: "#94a3b8", mt: 0.2 }}>
              {vehicleRecord?.owner || "Fleet Vehicle"} • {vehicleRecord?.modelType || vehicleRecord?.makeModel || "Commercial Vehicle"} {vehicleRecord?.size ? `(${vehicleRecord.size})` : ""}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
          <Close sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
        {/* Upload Section Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: "8px",
            border: "1px dashed #cbd5e1",
            bgcolor: "#ffffff",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", mb: 1.5, display: "flex", alignItems: "center", gap: 0.8 }}>
            <CloudUpload sx={{ fontSize: 18, color: "#2563eb" }} />
            Upload New Attachment for Specific Policy Year
          </Typography>

          <Grid container spacing={1.5} alignItems="center">
            {/* Year Selector */}
            <Grid item xs={12} sm={3}>
              <TextField
                select
                label="Policy Year"
                size="small"
                fullWidth
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                sx={{ bgcolor: "#f8fafc" }}
              >
                <MenuItem value={`${currentYear}-${currentYear + 1}`}>
                  {currentYear}-{currentYear + 1} (Current Year)
                </MenuItem>
                <MenuItem value={`${currentYear - 1}-${currentYear}`}>
                  {currentYear - 1}-{currentYear} (Previous Year)
                </MenuItem>
                <MenuItem value={`${currentYear - 2}-${currentYear - 1}`}>
                  {currentYear - 2}-{currentYear - 1} (Previous Year)
                </MenuItem>
                <MenuItem value={`${currentYear - 3}-${currentYear - 2}`}>
                  {currentYear - 3}-{currentYear - 2}
                </MenuItem>
                <MenuItem value="CUSTOM">Custom Year / Period...</MenuItem>
              </TextField>
            </Grid>

            {/* Custom Year Textfield if CUSTOM selected */}
            {formYear === "CUSTOM" && (
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Enter Year (e.g. 2023-2024)"
                  size="small"
                  fullWidth
                  value={customYear}
                  onChange={(e) => setCustomYear(e.target.value)}
                  placeholder="2023-2024"
                />
              </Grid>
            )}

            {/* Document Type */}
            <Grid item xs={12} sm={formYear === "CUSTOM" ? 3 : 3.5}>
              <TextField
                select
                label="Document Type"
                size="small"
                fullWidth
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                sx={{ bgcolor: "#f8fafc" }}
              >
                <MenuItem value="Policy Copy">Policy Copy (Renewed)</MenuItem>
                <MenuItem value="Previous Year Policy">Previous Year Policy Copy</MenuItem>
                <MenuItem value="Endorsement">Endorsement Document</MenuItem>
                <MenuItem value="Tax Invoice / Receipt">Payment Receipt / Invoice</MenuItem>
                <MenuItem value="RC / Registration">Vehicle RC Document</MenuItem>
                <MenuItem value="Quotation / Proposal">Quotation / Proposal</MenuItem>
                <MenuItem value="Other">Other Attachment</MenuItem>
              </TextField>
            </Grid>

            {/* Document Custom Name */}
            <Grid item xs={12} sm={formYear === "CUSTOM" ? 4 : 5.5}>
              <TextField
                label="Document Name / Label"
                size="small"
                fullWidth
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Policy_Copy_2026_27.pdf"
                sx={{ bgcolor: "#f8fafc" }}
              />
            </Grid>

            {/* File Input & Upload Action */}
            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.2,
                  bgcolor: "#f1f5f9",
                  borderRadius: "6px",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AttachFile sx={{ fontSize: 16 }} />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "12px", bgcolor: "#fff" }}
                  >
                    {selectedFile ? "Change File" : "Choose File..."}
                  </Button>
                  {selectedFile ? (
                    <Typography sx={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </Typography>
                  ) : (
                    <Typography sx={{ fontSize: "12px", color: "#64748b" }}>
                      Supports PDF, PNG, JPG, DOC (Max 15MB)
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  disabled={!selectedFile || uploading}
                  onClick={handleUploadAndSave}
                  startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUpload sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "12px",
                    px: 2,
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  }}
                >
                  {uploading ? "Uploading to S3..." : "Upload & Save"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Year Filter Tabs */}
        {availableYears.length > 0 && (
          <Box sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={selectedYearTab}
              onChange={(e, val) => setSelectedYearTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                "& .MuiTabs-indicator": { backgroundColor: "#2563eb", height: 2 },
              }}
            >
              <Tab
                label={`All Years (${attachments.length})`}
                value="ALL"
                sx={{ textTransform: "none", fontSize: "12px", minHeight: 36, py: 0.5, fontWeight: selectedYearTab === "ALL" ? 700 : 500 }}
              />
              {availableYears.map((yr) => {
                const count = attachments.filter((a) => a.year === yr).length;
                return (
                  <Tab
                    key={yr}
                    label={`${yr} (${count})`}
                    value={yr}
                    sx={{ textTransform: "none", fontSize: "12px", minHeight: 36, py: 0.5, fontWeight: selectedYearTab === yr ? 700 : 500 }}
                  />
                );
              })}
            </Tabs>
          </Box>
        )}

        {/* Attachments Content Area */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress size={30} sx={{ color: "#2563eb" }} />
          </Box>
        ) : filteredAttachments.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <InsertDriveFile sx={{ fontSize: 44, color: "#cbd5e1", mb: 1 }} />
            <Typography sx={{ fontWeight: 700, color: "#475569", fontSize: "14px" }}>
              No policy attachments found
            </Typography>
            <Typography sx={{ color: "#94a3b8", fontSize: "12px", mt: 0.5 }}>
              Use the upload box above to attach current or previous year policy copies for vehicle {regNo}.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {Object.keys(groupedByYear).map((yearKey) => (
              <Box key={yearKey}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <CalendarToday sx={{ fontSize: 15, color: "#2563eb" }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "13px", color: "#0f172a" }}>
                    Policy Period / Year: {yearKey}
                  </Typography>
                  <Chip
                    label={`${groupedByYear[yearKey].length} ${groupedByYear[yearKey].length === 1 ? "file" : "files"}`}
                    size="small"
                    sx={{ height: 18, fontSize: "10px", fontWeight: 700, bgcolor: "#eff6ff", color: "#1d4ed8" }}
                  />
                </Box>

                <Grid container spacing={1.5}>
                  {groupedByYear[yearKey].map((att, idx) => (
                    <Grid item xs={12} sm={6} key={att._id || idx}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          bgcolor: "#ffffff",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          height: "100%",
                          transition: "all 0.15s ease",
                          "&:hover": { borderColor: "#93c5fd", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.2 }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: "6px",
                              bgcolor: att.name?.endsWith(".pdf") || att.url?.endsWith(".pdf") ? "#fee2e2" : "#e0f2fe",
                              color: att.name?.endsWith(".pdf") || att.url?.endsWith(".pdf") ? "#dc2626" : "#0284c7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <PictureAsPdf sx={{ fontSize: 20 }} />
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mb: 0.3 }}>
                              <Chip
                                label={att.docType || "Policy Document"}
                                size="small"
                                sx={{
                                  fontSize: "9.5px",
                                  fontWeight: 700,
                                  height: 18,
                                  bgcolor: att.docType?.includes("Previous") ? "#fef3c7" : "#dcfce7",
                                  color: att.docType?.includes("Previous") ? "#92400e" : "#166534",
                                }}
                              />
                              {att.policyNo && att.policyNo !== "-" && (
                                <Typography sx={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                                  Pol: {att.policyNo}
                                </Typography>
                              )}
                            </Box>

                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "12.5px",
                                color: "#1e293b",
                                wordBreak: "break-all",
                                lineHeight: 1.3,
                              }}
                              title={att.name}
                            >
                              {att.name || "Insurance Document"}
                            </Typography>

                            {att.insuranceCompany && att.insuranceCompany !== "-" && (
                              <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.3 }}>
                                Insurer: {att.insuranceCompany}
                              </Typography>
                            )}

                            {att.uploadedAt && (
                              <Typography sx={{ fontSize: "10.5px", color: "#94a3b8", mt: 0.3 }}>
                                Uploaded on {new Date(att.uploadedAt).toLocaleDateString("en-IN")}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Stack direction="row" spacing={0.8}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Visibility sx={{ fontSize: 14 }} />}
                              onClick={() => window.open(att.url, "_blank", "noopener,noreferrer")}
                              sx={{
                                textTransform: "none",
                                fontSize: "11px",
                                fontWeight: 600,
                                py: 0.3,
                                px: 1,
                                height: 26,
                                borderColor: "#cbd5e1",
                                color: "#1e293b",
                                "&:hover": { borderColor: "#2563eb", color: "#2563eb", bgcolor: "#eff6ff" },
                              }}
                            >
                              View
                            </Button>

                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Download sx={{ fontSize: 14 }} />}
                              component="a"
                              href={att.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textTransform: "none",
                                fontSize: "11px",
                                fontWeight: 600,
                                py: 0.3,
                                px: 1,
                                height: 26,
                                borderColor: "#cbd5e1",
                                color: "#166534",
                                "&:hover": { borderColor: "#16a34a", color: "#16a34a", bgcolor: "#f0fdf4" },
                              }}
                            >
                              Download
                            </Button>
                          </Stack>

                          <Tooltip title="Delete Attachment">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteAttachment(att)}
                              sx={{ color: "#94a3b8", "&:hover": { color: "#dc2626", bgcolor: "#fee2e2" }, p: 0.5 }}
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: "none", fontWeight: 600, fontSize: "13px", bgcolor: "#1e293b" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

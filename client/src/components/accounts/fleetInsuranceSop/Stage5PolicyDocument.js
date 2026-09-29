import React, { useRef } from "react";
import { Box, Typography, Alert, Paper, Grid, Button, Stack, Chip } from "@mui/material";
import { Assignment, CloudUpload, InsertDriveFile, Visibility, Delete } from "@mui/icons-material";

function Stage5PolicyDocument({ formData, handleChange, formatDateValue, isView }) {
  const isPaymentDone = Boolean(formData.paymentUtr && String(formData.paymentUtr).trim().length > 0);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target.result;
      handleChange("policyDocumentUrl", base64Url);
      handleChange("policyDocumentName", file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = () => {
    handleChange("policyDocumentUrl", "");
    handleChange("policyDocumentName", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Box className="sop-container">
      {/* Status Alert Banner */}
      {!isPaymentDone ? (
        <Alert severity="warning" sx={{ mb: 1.5, fontSize: "12px" }}>
          <strong>Payment UTR Pending:</strong> Please complete Stage 4 (Payment & UTR) and save the transaction UTR number before entering the final issued policy details.
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mb: 1.5, fontSize: "12px" }}>
          <strong>Payment Completed:</strong> Payment UTR <strong>{formData.paymentUtr}</strong> recorded on {formData.paymentDate || "N/A"}. Please fill the issued policy number and validity dates below upon receiving the policy copy.
        </Alert>
      )}

      {/* Summary Context Card */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1.5,
          borderRadius: "6px",
          border: "1px solid #e2e8f0",
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Registration No.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1d4ed8" }}>
              {formData.registrationNo || "-"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Insurance Company
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a" }}>
              {formData.newInsuranceCompany || formData.insuranceCompany || "-"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Payment UTR No.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#166534" }}>
              {formData.paymentUtr || "Pending"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Renewed Policy Premium
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#16a34a" }}>
              ₹ {Number(formData.newTotalPolicyPremium || formData.totalPolicyPremium || formData.premiumAmount || 0).toLocaleString("en-IN")}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Issued Policy Document Card */}
      <Box className="sop-card">
        <Typography className="sop-card-title" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <Assignment sx={{ fontSize: 18, color: "#1e40af" }} />
          5. Final Issued Policy Details
        </Typography>

        <Box className="sop-grid-3" sx={{ mb: 1.5 }}>
          <Box>
            <label className="sop-label">NEW POLICY NO. *</label>
            <input
              type="text"
              className="sop-input"
              value={formData.newPolicyNo ?? ""}
              onChange={(e) => handleChange("newPolicyNo", e.target.value)}
              placeholder="e.g. 7412079532 / 33 / 34"
              style={{ fontWeight: 700, color: "#1d4ed8" }}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW VALID FROM *</label>
            <input
              type="date"
              className="sop-input"
              value={formatDateValue(formData.newPolicyFromDate)}
              onChange={(e) => handleChange("newPolicyFromDate", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW VALID TO (EXPIRY) *</label>
            <input
              type="date"
              className="sop-input"
              value={formatDateValue(formData.newPolicyToDate)}
              onChange={(e) => handleChange("newPolicyToDate", e.target.value)}
              style={{ fontWeight: 700, color: "#dc2626" }}
            />
          </Box>
        </Box>

        <Box className="sop-grid-2">
          <Box>
            <label className="sop-label">POLICY DOCUMENT REMARKS / NOTES</label>
            <input
              type="text"
              className="sop-input"
              value={formData.newRemarks ?? formData.remarks ?? ""}
              onChange={(e) => {
                handleChange("newRemarks", e.target.value);
                handleChange("remarks", e.target.value);
              }}
              placeholder="Policy copy received, endorsements, broker, branch notes..."
            />
          </Box>
          <Box>
            <label className="sop-label">FINAL WORKFLOW STATUS</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={
                formData.newPolicyNo && formData.paymentUtr
                  ? "RENEWED (Completed)"
                  : formData.paymentUtr
                  ? "Payment Done (Awaiting Policy Copy)"
                  : "Pending Payment & UTR"
              }
              style={{
                fontWeight: 700,
                color: formData.newPolicyNo && formData.paymentUtr ? "#166534" : "#b45309",
              }}
            />
          </Box>
        </Box>

        {/* Document Attachment Upload Section */}
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed #cbd5e1" }}>
          <Typography className="sop-card-title" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <CloudUpload sx={{ fontSize: 18, color: "#2563eb" }} />
            Policy Document Copy (PDF / Image Attachment)
          </Typography>

          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            style={{ display: "none" }}
            onChange={handleFileUpload}
            disabled={isView}
          />

          {!formData.policyDocumentUrl ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                textAlign: "center",
                border: "2px dashed #93c5fd",
                bgcolor: "#eff6ff",
                borderRadius: "8px",
                cursor: isView ? "default" : "pointer",
                "&:hover": { bgcolor: isView ? "#eff6ff" : "#dbeafe" }
              }}
              onClick={() => !isView && fileInputRef.current?.click()}
            >
              <CloudUpload sx={{ fontSize: 36, color: "#2563eb", mb: 0.5 }} />
              <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#1e40af" }}>
                Click to Upload Issued Policy Copy
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                Supported formats: PDF, PNG, JPG, JPEG, DOCX (Max size: 10MB)
              </Typography>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                border: "1px solid #bbf7d0",
                bgcolor: "#f0fdf4",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <InsertDriveFile sx={{ fontSize: 28, color: "#166534" }} />
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                    {formData.policyDocumentName || "Policy_Document_Copy.pdf"}
                  </Typography>
                  <Chip label="Uploaded & Attached" size="small" color="success" sx={{ fontSize: "9px", height: 16, fontWeight: 700 }} />
                </Box>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<Visibility sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    const w = window.open();
                    if (w) {
                      w.document.write(`<iframe src="${formData.policyDocumentUrl}" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                    }
                  }}
                  sx={{ textTransform: "none", fontSize: "12px", fontWeight: 600 }}
                >
                  View / Download
                </Button>
                {!isView && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Delete sx={{ fontSize: 16 }} />}
                    onClick={handleRemoveDocument}
                    sx={{ textTransform: "none", fontSize: "12px", fontWeight: 600 }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage5PolicyDocument);

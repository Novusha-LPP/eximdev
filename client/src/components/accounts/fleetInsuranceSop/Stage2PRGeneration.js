import React from "react";
import { Box, Typography, Alert } from "@mui/material";
import axios from "axios";

function Stage2PRGeneration({ formData, handleChange, formatDateValue }) {
  // Check mandatory fields required before PR generation readiness can be set to Yes
  const missingFields = [];
  if (!formData.registrationNo?.trim()) missingFields.push("Registration No.");
  const hasPolicyNo = (formData.newPolicyNo && formData.newPolicyNo.trim()) || (formData.policyNo && formData.policyNo.trim());
  if (!hasPolicyNo) missingFields.push("Policy No.");
  const hasValidTo = formData.newPolicyToDate || formData.policyToDate;
  if (!hasValidTo) missingFields.push("Valid To Date (Expiry)");
  const hasPremium = (Number(formData.newOdPremium) > 0) || 
                     (Number(formData.newTotalPolicyPremium) > 0) || 
                     (Number(formData.odPremium) > 0) || 
                     (Number(formData.totalPolicyPremium) > 0) ||
                     (Number(formData.newPremiumAmount) > 0) ||
                     (Number(formData.premiumAmount) > 0) ||
                     (Number(formData.premium) > 0);
  if (!hasPremium) missingFields.push("Premium Amount (OD / Total Policy Premium)");

  const isMandatoryFilled = missingFields.length === 0;
  const isReady = formData.readyForPr === "Yes";

  const handleGenerateNextPr = async () => {
    if (!isReady) {
      alert("Please select 'Ready for PR Generation? -> Yes' first.");
      return;
    }
    try {
      const targetDate = formData.prDate ? formatDateValue(formData.prDate) : new Date().toISOString().split("T")[0];
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/next-pr-number?date=${targetDate}`);
      if (res.data?.prNumber) {
        handleChange("prNumber", res.data.prNumber);
        if (!formData.prDate) {
          handleChange("prDate", targetDate);
        }
      }
    } catch (err) {
      console.error("Error auto-generating PR number:", err);
    }
  };

  return (
    <Box className="sop-container">
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          PR Generation Readiness
        </Typography>

        <Box className="sop-grid-3" sx={{ mb: 1.2 }}>
          <Box>
            <label className="sop-label">READY FOR PR GENERATION?</label>
            <select
              className="sop-select"
              value={formData.readyForPr || ""}
              onChange={(e) => handleChange("readyForPr", e.target.value)}
            >
              <option value="">Select</option>
              <option value="Yes" disabled={!isMandatoryFilled}>
                Yes {!isMandatoryFilled ? "(Fill mandatory details first)" : ""}
              </option>
              <option value="No">No</option>
            </select>
          </Box>
          <Box>
            <label className="sop-label">REQUIRED PREMIUM AMOUNT</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              style={{ fontWeight: 700, color: "#166534" }}
              value={`₹ ${Number(formData.newTotalPolicyPremium || formData.totalPolicyPremium || 0).toLocaleString("en-IN")}`}
            />
          </Box>
        </Box>

        {!isMandatoryFilled && (
          <Alert severity="warning" sx={{ py: 0.3, px: 1, fontSize: "11px", mb: 1 }}>
            To enable <strong>Ready for PR Generation = Yes</strong>, please fill mandatory details in Policy Proposal (Stage 1):{" "}
            <strong>{missingFields.join(", ")}</strong>.
          </Alert>
        )}

        {!isReady && isMandatoryFilled && (
          <Alert severity="info" sx={{ py: 0.3, px: 1, fontSize: "11px", mb: 1 }}>
            Set <strong>Ready for PR Generation?</strong> to <strong>Yes</strong> to auto-generate the sequential PR Number.
          </Alert>
        )}
      </Box>

      {/* ─── PR Details Card ─── */}
      <Box className="sop-card">
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Purchase Request Information
        </Typography>
        <Box className="sop-grid-2">
          <Box>
            <label className="sop-label">PR NUMBER</label>
            <Box sx={{ display: "flex", gap: 0.8 }}>
              <input
                type="text"
                className={`sop-input ${!isReady ? "readonly" : ""}`}
                value={formData.prNumber || ""}
                onChange={(e) => handleChange("prNumber", e.target.value)}
                disabled={!isReady}
                placeholder="Auto format: INS/01/AUG/2627"
                style={{ fontWeight: 700, color: "#1d4ed8" }}
              />
              <button
                type="button"
                className="sop-btn sop-btn-primary"
                onClick={handleGenerateNextPr}
                disabled={!isReady}
                style={{ padding: "0 10px", fontSize: "11px" }}
              >
                Auto PR
              </button>
            </Box>
          </Box>

          <Box>
            <label className="sop-label">PR DATE</label>
            <input
              type="date"
              className={`sop-input ${!isReady ? "readonly" : ""}`}
              value={formatDateValue(formData.prDate)}
              onChange={(e) => handleChange("prDate", e.target.value)}
              disabled={!isReady}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage2PRGeneration);

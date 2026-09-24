import React from "react";
import { Typography, Box } from "@mui/material";

function Stage4PaymentUtr({ formData, handleChange, formatDateValue }) {
  return (
    <Box className="sop-container">
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Financial Status Summary
        </Typography>
        <Box sx={{ fontSize: "12px", color: "#334155" }}>
          Approval Status: <strong>{formData.financialApprovalStatus === "Pending" ? "Pending Approval" : (formData.financialApprovalStatus || "Pending Approval")}</strong>
        </Box>
      </Box>

      {/* Payment and UTR Entry Card */}
      <Box className="sop-card">
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Payment & UTR Details
        </Typography>

        <Box className="sop-grid-3" sx={{ mb: 1.2 }}>
          <Box>
            <label className="sop-label">PAYMENT UTR NO. *</label>
            <input
              type="text"
              className="sop-input"
              value={formData.paymentUtr || ""}
              onChange={(e) => handleChange("paymentUtr", e.target.value.toUpperCase())}
              placeholder="Enter bank transaction UTR"
              style={{ fontWeight: 700, color: "#1d4ed8" }}
            />
          </Box>
          <Box>
            <label className="sop-label">PAYMENT DATE</label>
            <input
              type="date"
              className="sop-input"
              value={formatDateValue(formData.paymentDate)}
              onChange={(e) => handleChange("paymentDate", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">RENEWAL DATE</label>
            <input
              type="date"
              className="sop-input"
              value={formatDateValue(formData.renewalDate || formData.paymentDate)}
              onChange={(e) => handleChange("renewalDate", e.target.value)}
            />
          </Box>
        </Box>

        <Box className="sop-grid-2">
          <Box>
            <label className="sop-label">WORKFLOW STATUS</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={formData.renewalStatus || "Pending"}
              style={{
                fontWeight: 700,
                color: formData.renewalStatus === "Renewed" ? "#166534" : "#b45309",
              }}
            />
          </Box>
          <Box>
            <label className="sop-label">TAT (DAYS)</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={formData.tat ? `${formData.tat} days` : "0 days"}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage4PaymentUtr);

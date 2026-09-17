import React from "react";
import { Typography, Box } from "@mui/material";

function Stage3FinanceApproval({ formData, handleChange }) {
  return (
    <Box className="sop-container">
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Financial Summary
        </Typography>

        <Box className="sop-grid-4" sx={{ mb: 1.5 }}>
          <Box>
            <label className="sop-label">PR NUMBER</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={formData.prNumber || "N/A"}
              style={{ fontWeight: 700, color: "#1e40af" }}
            />
          </Box>
          <Box>
            <label className="sop-label">INSURANCE COMPANY</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={formData.newInsuranceCompany || formData.insuranceCompany || "-"}
            />
          </Box>
          <Box>
            <label className="sop-label">RENEWAL TOTAL IDV</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={`₹ ${Number(
                formData.newTotalIdv ||
                formData.totalIdv ||
                ((Number(formData.newIdv) || 0) + (Number(formData.newElectricalAccessoriesIdv) || 0) + (Number(formData.newCngKitIdv) || 0)) ||
                ((Number(formData.idv) || 0) + (Number(formData.electricalAccessoriesIdv) || 0) + (Number(formData.cngKitIdv) || 0)) ||
                0
              ).toLocaleString("en-IN")}`}
              style={{ fontWeight: 600 }}
            />
          </Box>
          <Box>
            <label className="sop-label">REQUESTED PREMIUM</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={`₹ ${Number(formData.newTotalPolicyPremium || 0).toLocaleString("en-IN")}`}
              style={{ fontWeight: 700, color: "#166534" }}
            />
          </Box>
        </Box>
      </Box>

      {/* Decision Card */}
      <Box className="sop-card">
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Finance Manager Decision
        </Typography>
        <Box className="sop-grid-2">
          <Box>
            <label className="sop-label">APPROVAL STATUS</label>
            <select
              className="sop-select"
              value={formData.financialApprovalStatus === "Draft" || !formData.financialApprovalStatus ? "Pending" : formData.financialApprovalStatus}
              onChange={(e) => handleChange("financialApprovalStatus", e.target.value)}
              style={{
                fontWeight: 700,
                color: formData.financialApprovalStatus === "Approved" ? "#166534" : formData.financialApprovalStatus === "Rejected" ? "#dc2626" : "#b45309",
              }}
            >
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage3FinanceApproval);

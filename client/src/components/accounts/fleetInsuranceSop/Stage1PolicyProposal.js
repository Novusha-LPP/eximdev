import React from "react";
import { Box, Typography } from "@mui/material";

function Stage1PolicyProposal({ formData, handleChange, handleRegistrationBlur, formatDateValue, isView, isRenew }) {
  const addCustomField = (key) => {
    const current = formData[key] || [];
    handleChange(key, [...current, { id: Date.now(), label: "", value: "" }]);
  };

  const updateCustomField = (key, index, field, value) => {
    const current = [...(formData[key] || [])];
    current[index] = { ...current[index], [field]: value };
    handleChange(key, current);
  };

  const removeCustomField = (key, index) => {
    const current = (formData[key] || []).filter((_, i) => i !== index);
    handleChange(key, current);
  };

  return (
    <Box className="sop-container">
      {/* ─── ROW 1: Stacked Sections (One after another) ─── */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 1.5 }}>
        {/* Left: Vehicle Details & Technical Info */}
        <Box className="sop-card">
          <Typography className="sop-card-title" sx={{ mb: 1 }}>
            1. Vehicle & Technical Details
          </Typography>
          <Box className="sop-grid-3" sx={{ mb: 1 }}>
            <Box>
              <label className="sop-label">REGISTRATION NO. *</label>
              <input
                type="text"
                className="sop-input"
                value={formData.registrationNo ?? ""}
                onChange={(e) => handleChange("registrationNo", e.target.value.toUpperCase())}
                onBlur={handleRegistrationBlur}
                placeholder="e.g. GJ12Z1090"
                style={{ fontWeight: 700, color: "#1d4ed8" }}
              />
            </Box>
            <Box>
              <label className="sop-label">REGISTRATION DATE</label>
              <input
                type="date"
                className="sop-input"
                value={formatDateValue(formData.registrationDate)}
                onChange={(e) => handleChange("registrationDate", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">OWNER</label>
              <input
                type="text"
                className="sop-input"
                value={formData.owner ?? ""}
                onChange={(e) => handleChange("owner", e.target.value.toUpperCase())}
              />
            </Box>
          </Box>

          <Box className="sop-grid-4" sx={{ mb: 1 }}>
            <Box>
              <label className="sop-label">MAKE / MODEL</label>
              <input
                type="text"
                className="sop-input"
                value={formData.makeModel ?? ""}
                onChange={(e) => handleChange("makeModel", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">MODEL TYPE</label>
              <input
                type="text"
                className="sop-input"
                value={formData.modelType ?? ""}
                onChange={(e) => handleChange("modelType", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">SIZE</label>
              <input
                type="text"
                className="sop-input"
                value={formData.size ?? ""}
                onChange={(e) => handleChange("size", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">GVW (KG)</label>
              <input
                type="number"
                className="sop-input"
                value={formData.gvw ?? ""}
                onChange={(e) => handleChange("gvw", e.target.value)}
              />
            </Box>
          </Box>

          <Box className="sop-grid-4">
            <Box>
              <label className="sop-label">ENGINE NUMBER</label>
              <input
                type="text"
                className="sop-input"
                value={formData.engineNumber ?? ""}
                onChange={(e) => handleChange("engineNumber", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">CHASSIS NUMBER</label>
              <input
                type="text"
                className="sop-input"
                value={formData.chassisNumber ?? ""}
                onChange={(e) => handleChange("chassisNumber", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">CC / KW / GVW</label>
              <input
                type="text"
                className="sop-input"
                value={formData.cubicCapacityKw ?? ""}
                onChange={(e) => handleChange("cubicCapacityKw", e.target.value)}
                placeholder="5883 / 45500"
              />
            </Box>
            <Box>
              <label className="sop-label">MFG. YEAR / REG</label>
              <input
                type="text"
                className="sop-input"
                value={formData.mfgYear ?? ""}
                onChange={(e) => handleChange("mfgYear", e.target.value)}
                placeholder="2018"
              />
            </Box>
          </Box>
        </Box>

        {/* Right: Current / Previous Policy Details */}
        <Box className="sop-card">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography className="sop-card-title">
              {isRenew ? "2. Previous Policy Details" : "2. Current Policy Details"}
            </Typography>
            <button
              type="button"
              className="sop-btn sop-btn-secondary"
              style={{ padding: "2px 8px", fontSize: "10.5px" }}
              onClick={() => addCustomField("section2CustomFields")}
            >
              + Add Field
            </button>
          </Box>

          <Box className="sop-grid-3" sx={{ mb: 1 }}>
            <Box>
              <label className="sop-label">INSURANCE COMPANY</label>
              <input
                type="text"
                className="sop-input"
                value={formData.insuranceCompany ?? ""}
                onChange={(e) => handleChange("insuranceCompany", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">POLICY NUMBER</label>
              <input
                type="text"
                className="sop-input"
                value={formData.policyNo ?? ""}
                onChange={(e) => handleChange("policyNo", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">IDV BASIC (₹)</label>
              <input
                type="number"
                className="sop-input"
                value={formData.idv ?? ""}
                onChange={(e) => handleChange("idv", e.target.value)}
              />
            </Box>
          </Box>

          <Box className="sop-grid-3" sx={{ mb: 1 }}>
            <Box>
              <label className="sop-label">VALID FROM DATE</label>
              <input
                type="date"
                className="sop-input"
                value={formatDateValue(formData.policyFromDate)}
                onChange={(e) => handleChange("policyFromDate", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">VALID TO DATE (EXPIRY)</label>
              <input
                type="date"
                className="sop-input"
                value={formatDateValue(formData.policyToDate)}
                onChange={(e) => handleChange("policyToDate", e.target.value)}
                style={{ fontWeight: 700, color: "#dc2626" }}
              />
            </Box>
            <Box>
              <label className="sop-label">ELECTRICAL ACC. IDV (₹)</label>
              <input
                type="number"
                className="sop-input"
                value={formData.electricalAccessoriesIdv ?? ""}
                onChange={(e) => handleChange("electricalAccessoriesIdv", e.target.value)}
              />
            </Box>
          </Box>

          <Box className="sop-grid-4">
            <Box>
              <label className="sop-label">CNG KIT IDV (₹)</label>
              <input
                type="number"
                className="sop-input"
                value={formData.cngKitIdv ?? ""}
                onChange={(e) => handleChange("cngKitIdv", e.target.value)}
              />
            </Box>
            <Box>
              <label className="sop-label">HYDRAULIC JACK (₹)</label>
              <input
                type="number"
                className="sop-input"
                value={formData.hydraulicJackCover ?? formData.hydrolicJackCover ?? ""}
                onChange={(e) => {
                  handleChange("hydraulicJackCover", e.target.value);
                  handleChange("hydrolicJackCover", e.target.value);
                }}
              />
            </Box>
            <Box>
              <label className="sop-label">MODERATION TIPPER</label>
              <input
                type="number"
                className="sop-input"
                value={formData.moderationAmountTipper ?? formData.moderationAmount ?? ""}
                onChange={(e) => {
                  handleChange("moderationAmountTipper", e.target.value);
                  handleChange("moderationAmount", e.target.value);
                }}
              />
            </Box>
            <Box>
              <label className="sop-label">TOTAL IDV (₹)</label>
              <input
                type="number"
                className="sop-input"
                value={formData.totalIdv ?? ""}
                onChange={(e) => handleChange("totalIdv", e.target.value)}
                style={{ fontWeight: 700, color: "#0f172a" }}
              />
            </Box>
          </Box>

          {/* Additional Custom Fields for Section 2 */}
          {(formData.section2CustomFields || []).length > 0 && (
            <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px dashed #cbd5e1" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {(formData.section2CustomFields || []).map((cf, idx) => (
                  <Box key={cf.id || idx} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <input
                      type="text"
                      className="sop-input"
                      placeholder="Field Title (e.g. RTI Cover)"
                      value={cf.label || ""}
                      onChange={(e) => updateCustomField("section2CustomFields", idx, "label", e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      className="sop-input"
                      placeholder="Value (₹)"
                      value={cf.value ?? ""}
                      onChange={(e) => updateCustomField("section2CustomFields", idx, "value", e.target.value)}
                      style={{ width: 140 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField("section2CustomFields", idx)}
                      style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontWeight: "bold", padding: "0 6px" }}
                    >
                      ✕
                    </button>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* ─── ROW 2: Previous Premium Breakdown ─── */}
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography className="sop-card-title">
            2B. Previous / Current Premium Breakdown
          </Typography>
          <button
            type="button"
            className="sop-btn sop-btn-secondary"
            style={{ padding: "2px 8px", fontSize: "10.5px" }}
            onClick={() => addCustomField("section2BCustomFields")}
          >
            + Add Field
          </button>
        </Box>

        <Box className="sop-grid-4" sx={{ mb: 1 }}>
          <Box>
            <label className="sop-label">OD PREMIUM (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.odPremium ?? ""}
              onChange={(e) => handleChange("odPremium", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">IMT 23 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.imt23 ?? ""}
              onChange={(e) => handleChange("imt23", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">IMT 24 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.imt24 ?? ""}
              onChange={(e) => handleChange("imt24", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">IMT 25 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.imt25 ?? ""}
              onChange={(e) => handleChange("imt25", e.target.value)}
            />
          </Box>
        </Box>

        <Box className="sop-grid-4" sx={{ mb: 1 }}>
          <Box>
            <label className="sop-label">TOTAL OD PREMIUM</label>
            <input
              type="number"
              className="sop-input readonly"
              readOnly
              value={formData.totalOdPremium ?? ""}
              style={{ fontWeight: 600 }}
            />
          </Box>
          <Box>
            <label className="sop-label">IMT 17 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.imt17 ?? ""}
              onChange={(e) => handleChange("imt17", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">IMT 252 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.imt252 ?? ""}
              onChange={(e) => handleChange("imt252", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">IMT 28 / 29 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.imt28 ?? formData.imt29 ?? ""}
              onChange={(e) => {
                handleChange("imt28", e.target.value);
                handleChange("imt29", e.target.value);
              }}
            />
          </Box>
        </Box>

        <Box className="sop-grid-3">
          <Box>
            <label className="sop-label">LIABILITY PREMIUM (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.liabilityPremium ?? ""}
              onChange={(e) => handleChange("liabilityPremium", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">TOTAL GST 18% (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.totalGst ?? ""}
              onChange={(e) => handleChange("totalGst", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">TOTAL POLICY PREMIUM</label>
            <input
              type="number"
              className="sop-input"
              value={formData.totalPolicyPremium ?? formData.premiumAmount ?? ""}
              onChange={(e) => {
                handleChange("totalPolicyPremium", e.target.value);
                handleChange("premiumAmount", e.target.value);
              }}
              style={{ fontWeight: 700, color: "#166534" }}
            />
          </Box>
        </Box>

        {/* Custom Fields for Section 2B: Previous / Current Premium Breakdown */}
        {(formData.section2BCustomFields || []).length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px dashed #cbd5e1" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(formData.section2BCustomFields || []).map((cf, idx) => (
                <Box key={cf.id || idx} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <input
                    type="text"
                    className="sop-input"
                    placeholder="Field Title (e.g. Zero Dep)"
                    value={cf.label || ""}
                    onChange={(e) => updateCustomField("section2BCustomFields", idx, "label", e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="sop-input"
                    placeholder="Value (₹)"
                    value={cf.value ?? ""}
                    onChange={(e) => updateCustomField("section2BCustomFields", idx, "value", e.target.value)}
                    style={{ width: 140 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomField("section2BCustomFields", idx)}
                    style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontWeight: "bold", padding: "0 6px" }}
                  >
                    ✕
                  </button>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* ─── ROW 3: Merged Renewed Policy & Premium Breakdown ─── */}
      <Box className="sop-card" style={{ backgroundColor: "#fbfcfe" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography className="sop-card-title" sx={{ color: "#1e40af" }}>
            3. Proposed Renewed Policy & Premium Breakdown
          </Typography>
          <button
            type="button"
            className="sop-btn sop-btn-secondary"
            style={{ padding: "2px 8px", fontSize: "10.5px" }}
            onClick={() => addCustomField("section3BCustomFields")}
          >
            + Add Field
          </button>
        </Box>

        {/* Top Policy Info Row */}
        <Box className="sop-grid-4" sx={{ mb: 1.5 }}>
          <Box>
            <label className="sop-label">NEW INSURANCE COMPANY</label>
            <input
              type="text"
              className="sop-input"
              value={formData.newInsuranceCompany ?? ""}
              onChange={(e) => handleChange("newInsuranceCompany", e.target.value)}
              placeholder="e.g. Universal Sompo General Insurance"
            />
          </Box>
          <Box>
            <label className="sop-label">NEW IDV BASIC (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newIdv ?? ""}
              onChange={(e) => handleChange("newIdv", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW TOTAL IDV (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newTotalIdv ?? ""}
              onChange={(e) => handleChange("newTotalIdv", e.target.value)}
              style={{ fontWeight: 700, color: "#0f172a" }}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW NCB (%)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newNcb ?? ""}
              onChange={(e) => handleChange("newNcb", e.target.value)}
            />
          </Box>
        </Box>

        {/* Premium Breakdown Fields */}
        <Box className="sop-grid-4" sx={{ mb: 1 }}>
          <Box>
            <label className="sop-label">NEW OD PREMIUM (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newOdPremium ?? ""}
              onChange={(e) => handleChange("newOdPremium", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW IMT 23 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newImt23 ?? ""}
              onChange={(e) => handleChange("newImt23", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW IMT 24 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newImt24 ?? ""}
              onChange={(e) => handleChange("newImt24", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW IMT 25 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newImt25 ?? ""}
              onChange={(e) => handleChange("newImt25", e.target.value)}
            />
          </Box>
        </Box>

        <Box className="sop-grid-4" sx={{ mb: 1 }}>
          <Box>
            <label className="sop-label">NEW TOTAL OD</label>
            <input
              type="number"
              className="sop-input readonly"
              readOnly
              value={formData.newTotalOdPremium ?? ""}
              style={{ fontWeight: 600 }}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW IMT 17 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newImt17 ?? ""}
              onChange={(e) => handleChange("newImt17", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW IMT 252 (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newImt252 ?? ""}
              onChange={(e) => handleChange("newImt252", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW IMT 28 / 29</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newImt28 ?? formData.newImt29 ?? ""}
              onChange={(e) => {
                handleChange("newImt28", e.target.value);
                handleChange("newImt29", e.target.value);
              }}
            />
          </Box>
        </Box>

        <Box className="sop-grid-3" sx={{ mb: 1.5 }}>
          <Box>
            <label className="sop-label">NEW LIABILITY (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newLiabilityPremium ?? ""}
              onChange={(e) => handleChange("newLiabilityPremium", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">NEW GST 18% (₹)</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newTotalGst ?? ""}
              onChange={(e) => handleChange("newTotalGst", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">RENEWED TOTAL POLICY</label>
            <input
              type="number"
              className="sop-input"
              value={formData.newTotalPolicyPremium ?? formData.newPremiumAmount ?? ""}
              onChange={(e) => {
                handleChange("newTotalPolicyPremium", e.target.value);
                handleChange("newPremiumAmount", e.target.value);
              }}
              style={{ fontWeight: 700, color: "#1d4ed8" }}
            />
          </Box>
        </Box>

        {/* Custom Fields for 3B: Additional Premium Fields */}
        {(formData.section3BCustomFields || []).length > 0 && (
          <Box sx={{ mb: 1.5, pt: 1, borderTop: "1px dashed #cbd5e1" }}>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
              Additional Premium Fields
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(formData.section3BCustomFields || []).map((cf, idx) => (
                <Box key={cf.id || idx} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <input
                    type="text"
                    className="sop-input"
                    placeholder="Field Title (e.g. Zero Dep)"
                    value={cf.label || ""}
                    onChange={(e) => updateCustomField("section3BCustomFields", idx, "label", e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="sop-input"
                    placeholder="Value (₹)"
                    value={cf.value ?? ""}
                    onChange={(e) => updateCustomField("section3BCustomFields", idx, "value", e.target.value)}
                    style={{ width: 140 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomField("section3BCustomFields", idx)}
                    style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontWeight: "bold", padding: "0 6px" }}
                  >
                    ✕
                  </button>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Remarks / Notes */}
        <Box>
          <label className="sop-label">REMARKS / NOTES</label>
          <input
            type="text"
            className="sop-input"
            value={formData.newRemarks ?? formData.remarks ?? ""}
            onChange={(e) => {
              handleChange("newRemarks", e.target.value);
              handleChange("remarks", e.target.value);
            }}
            placeholder="Policy endorsements, broker, branch notes..."
          />
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage1PolicyProposal);

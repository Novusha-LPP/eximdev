import React from "react";
import {
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Alert
} from "@mui/material";

function Stage1PolicyProposal({ formData, handleChange, handleRegistrationBlur, formatDateValue, isView }) {
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
                     (Number(formData.premiumAmount) > 0);
  if (!hasPremium) missingFields.push("Premium Amount (OD / Total Policy Premium)");

  const isMandatoryFilled = missingFields.length === 0;

  return (
    <>
      {/* Vehicle Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          1. Vehicle Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Sr. No." type="number" value={formData.srNo ?? ""} onChange={(e) => handleChange("srNo", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField 
              label="Registration No. *" 
              value={formData.registrationNo ?? ""} 
              onChange={(e) => handleChange("registrationNo", e.target.value)} 
              onBlur={handleRegistrationBlur}
              fullWidth 
              size="small" 
              required 
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Registration Date" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.registrationDate)} onChange={(e) => handleChange("registrationDate", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Owner" value={formData.owner ?? ""} onChange={(e) => handleChange("owner", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Make/Model" value={formData.makeModel ?? ""} onChange={(e) => handleChange("makeModel", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Model" value={formData.modelType ?? ""} onChange={(e) => handleChange("modelType", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Size" value={formData.size ?? ""} onChange={(e) => handleChange("size", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="GVW" type="number" value={formData.gvw ?? ""} onChange={(e) => handleChange("gvw", e.target.value)} fullWidth size="small" />
          </Grid>

        </Grid>
      </Paper>

      {/* Vehicle Technical Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          1B. Vehicle Technical Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Engine Number" value={formData.engineNumber ?? ""} onChange={(e) => handleChange("engineNumber", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Chassis Number" value={formData.chassisNumber ?? ""} onChange={(e) => handleChange("chassisNumber", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Cubic Capacity / KW / GVW" value={formData.cubicCapacityKw ?? ""} onChange={(e) => handleChange("cubicCapacityKw", e.target.value)} fullWidth size="small" placeholder="e.g. 5883 / 45500" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Mfg. Year / Reg Date" value={formData.mfgYear ?? ""} onChange={(e) => handleChange("mfgYear", e.target.value)} fullWidth size="small" placeholder="e.g. 2018 / 13-06-2018" />
          </Grid>
        </Grid>
      </Paper>

      {/* Previous Policy Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          2. Previous Policy Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Insurance Company" value={formData.insuranceCompany ?? ""} onChange={(e) => handleChange("insuranceCompany", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Policy No." value={formData.policyNo ?? ""} onChange={(e) => handleChange("policyNo", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Valid From" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.policyFromDate)} onChange={(e) => handleChange("policyFromDate", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Valid To" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.policyToDate)} onChange={(e) => handleChange("policyToDate", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Vehicle IDV (₹)" type="number" value={formData.idv ?? ""} onChange={(e) => handleChange("idv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Electrical Accessories IDV (₹)" type="number" value={formData.electricalAccessoriesIdv ?? ""} onChange={(e) => handleChange("electricalAccessoriesIdv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="CNG Kit IDV (₹)" type="number" value={formData.cngKitIdv ?? ""} onChange={(e) => handleChange("cngKitIdv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total IDV (₹)" type="number" value={formData.totalIdv || ((Number(formData.idv) || 0) + (Number(formData.electricalAccessoriesIdv) || 0) + (Number(formData.cngKitIdv) || 0))} fullWidth size="small" InputProps={{ readOnly: true }} sx={{ "& .MuiInputBase-root": { backgroundColor: "#f5f5f5" } }} />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Prev Premium (₹)" type="number" value={formData.premiumAmount ?? ""} onChange={(e) => handleChange("premiumAmount", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="NCB (%)" type="number" value={formData.ncbPercentage ?? ""} onChange={(e) => handleChange("ncbPercentage", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Premium (₹)" type="number" value={formData.premium ?? ""} onChange={(e) => handleChange("premium", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Renewal Date" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.renewalDate)} onChange={(e) => handleChange("renewalDate", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12}>
            <TextField label="Remarks" multiline rows={2} value={formData.remarks ?? ""} onChange={(e) => handleChange("remarks", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Insurance Premium Breakdown */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          2B. Insurance Premium Breakdown
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Granular premium breakdown from the insurance portal data.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="OD Premium (₹)" type="number" value={formData.odPremium ?? ""} onChange={(e) => handleChange("odPremium", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 23 (₹)" type="number" value={formData.imt23 ?? ""} onChange={(e) => handleChange("imt23", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 24 (₹)" type="number" value={formData.imt24 ?? ""} onChange={(e) => handleChange("imt24", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 25 (₹)" type="number" value={formData.imt25 ?? ""} onChange={(e) => handleChange("imt25", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total OD Premium (₹)" type="number" value={formData.totalOdPremium ?? ""} onChange={(e) => handleChange("totalOdPremium", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 17 (₹)" type="number" value={formData.imt17 ?? ""} onChange={(e) => handleChange("imt17", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 252 (₹)" type="number" value={formData.imt252 ?? ""} onChange={(e) => handleChange("imt252", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 28 (₹)" type="number" value={formData.imt28 ?? ""} onChange={(e) => handleChange("imt28", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 29 (₹)" type="number" value={formData.imt29 ?? ""} onChange={(e) => handleChange("imt29", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Liability Premium (₹)" type="number" value={formData.liabilityPremium ?? ""} onChange={(e) => handleChange("liabilityPremium", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total GST (₹)" type="number" value={formData.totalGst ?? ""} onChange={(e) => handleChange("totalGst", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total Policy Premium (₹)" type="number" value={formData.totalPolicyPremium ?? ""} onChange={(e) => handleChange("totalPolicyPremium", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Renewed Policy Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          3. Renewed Policy Details
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Enter the new/renewed policy details here. These will become "Previous Policy Details" during the next renewal.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Insurance Company" value={formData.newInsuranceCompany ?? ""} onChange={(e) => handleChange("newInsuranceCompany", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Policy No. *" value={formData.newPolicyNo ?? ""} onChange={(e) => handleChange("newPolicyNo", e.target.value)} fullWidth size="small" required />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Valid From" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.newPolicyFromDate)} onChange={(e) => handleChange("newPolicyFromDate", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Valid To *" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.newPolicyToDate)} onChange={(e) => handleChange("newPolicyToDate", e.target.value)} fullWidth size="small" required />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Vehicle IDV (₹)" type="number" value={formData.newIdv ?? ""} onChange={(e) => handleChange("newIdv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Electrical Accessories IDV (₹)" type="number" value={formData.newElectricalAccessoriesIdv ?? ""} onChange={(e) => handleChange("newElectricalAccessoriesIdv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="CNG Kit IDV (₹)" type="number" value={formData.newCngKitIdv ?? ""} onChange={(e) => handleChange("newCngKitIdv", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total IDV (₹)" type="number" value={formData.newTotalIdv || ((Number(formData.newIdv) || 0) + (Number(formData.newElectricalAccessoriesIdv) || 0) + (Number(formData.newCngKitIdv) || 0))} fullWidth size="small" InputProps={{ readOnly: true }} sx={{ "& .MuiInputBase-root": { backgroundColor: "#f5f5f5" } }} />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Premium Amount (₹)" type="number" value={formData.newPremiumAmount ?? ""} onChange={(e) => handleChange("newPremiumAmount", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="NCB (%)" type="number" value={formData.newNcb ?? ""} onChange={(e) => handleChange("newNcb", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Premium (₹)" type="number" value={formData.newPremium ?? ""} onChange={(e) => handleChange("newPremium", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12}>
            <TextField label="Remarks" multiline rows={2} value={formData.newRemarks ?? ""} onChange={(e) => handleChange("newRemarks", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Renewed Insurance Premium Breakdown */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          3B. Renewed Insurance Premium Breakdown
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Granular premium breakdown for the renewed/new policy.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="OD Premium (₹) *" type="number" value={formData.newOdPremium ?? ""} onChange={(e) => handleChange("newOdPremium", e.target.value)} fullWidth size="small" required />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 23 (₹)" type="number" value={formData.newImt23 ?? ""} onChange={(e) => handleChange("newImt23", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 24 (₹)" type="number" value={formData.newImt24 ?? ""} onChange={(e) => handleChange("newImt24", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 25 (₹)" type="number" value={formData.newImt25 ?? ""} onChange={(e) => handleChange("newImt25", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total OD Premium (₹)" type="number" value={formData.newTotalOdPremium ?? ""} onChange={(e) => handleChange("newTotalOdPremium", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 17 (₹)" type="number" value={formData.newImt17 ?? ""} onChange={(e) => handleChange("newImt17", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 252 (₹)" type="number" value={formData.newImt252 ?? ""} onChange={(e) => handleChange("newImt252", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 28 (₹)" type="number" value={formData.newImt28 ?? ""} onChange={(e) => handleChange("newImt28", e.target.value)} fullWidth size="small" />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField label="IMT 29 (₹)" type="number" value={formData.newImt29 ?? ""} onChange={(e) => handleChange("newImt29", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Liability Premium (₹)" type="number" value={formData.newLiabilityPremium ?? ""} onChange={(e) => handleChange("newLiabilityPremium", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total GST (₹)" type="number" value={formData.newTotalGst ?? ""} onChange={(e) => handleChange("newTotalGst", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Total Policy Premium (₹) *" type="number" value={formData.newTotalPolicyPremium ?? ""} onChange={(e) => handleChange("newTotalPolicyPremium", e.target.value)} fullWidth size="small" required />
          </Grid>
        </Grid>
      </Paper>

      {/* Ready for PR Generation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          4. PR Generation Readiness
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField select label="Ready for PR Generation?" value={formData.readyForPr || ""} onChange={(e) => handleChange("readyForPr", e.target.value)} fullWidth size="small">
              <MenuItem value="">Select</MenuItem>
              <MenuItem value="Yes" disabled={!isMandatoryFilled}>
                Yes {!isMandatoryFilled ? "(Fill mandatory details first)" : ""}
              </MenuItem>
              <MenuItem value="No">No</MenuItem>
            </TextField>
          </Grid>
          {!isMandatoryFilled && (
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ py: 0.5 }}>
                To enable <strong>Ready for PR Generation = Yes</strong>, please fill mandatory details:{" "}
                <strong>{missingFields.join(", ")}</strong>.
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>
    </>
  );
}

export default React.memo(Stage1PolicyProposal);

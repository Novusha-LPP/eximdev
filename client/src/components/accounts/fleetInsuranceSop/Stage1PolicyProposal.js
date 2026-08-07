import React from "react";
import {
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Box,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

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

  const renderCustomFields = (key) => {
    const fields = formData[key] || [];
    return fields.map((cf, idx) => (
      <Grid item xs={12} sm={6} md={3} key={cf.id || idx}>
        <Paper variant="outlined" sx={{ p: 1, backgroundColor: "#f8fafc" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <TextField
              label="Custom Field Title"
              placeholder="e.g. RTI Cover / Zero Dep"
              value={cf.label || ""}
              onChange={(e) => updateCustomField(key, idx, "label", e.target.value)}
              size="small"
              fullWidth
              variant="standard"
            />
            <IconButton size="small" color="error" onClick={() => removeCustomField(key, idx)}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
          <TextField
            label={cf.label ? `${cf.label} (₹)` : "Value (₹)"}
            value={cf.value ?? ""}
            onChange={(e) => updateCustomField(key, idx, "value", e.target.value)}
            fullWidth
            size="small"
          />
        </Paper>
      </Grid>
    ));
  };

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

      {/* Current / Previous Policy Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" color="primary">
            {isRenew ? "2. Previous Policy Details" : "2. Current Policy Details"}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => addCustomField("section2CustomFields")}
          >
            + Add Field (Section 2)
          </Button>
        </Box>
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

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label={isRenew ? "Prev Premium (₹)" : "Current Premium (₹)"}
              type="number"
              value={formData.premiumAmount ?? formData.premium ?? ""}
              onChange={(e) => {
                handleChange("premiumAmount", e.target.value);
                handleChange("premium", e.target.value);
              }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField label="Renewal Date" type="date" InputLabelProps={{ shrink: true }} value={formatDateValue(formData.renewalDate)} onChange={(e) => handleChange("renewalDate", e.target.value)} fullWidth size="small" />
          </Grid>

          {renderCustomFields("section2CustomFields")}

          <Grid item xs={12}>
            <TextField label="Remarks" multiline rows={2} value={formData.remarks ?? ""} onChange={(e) => handleChange("remarks", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Current / Previous Insurance Premium Breakdown */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" color="primary">
            {isRenew ? "2B. Previous Insurance Premium Breakdown" : "2B. Current Insurance Premium Breakdown"}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => addCustomField("section2BCustomFields")}
          >
            + Add Field (Section 2B)
          </Button>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {isRenew ? "Granular premium breakdown from previous policy." : "Granular premium breakdown from current policy data."}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="OD Premium (₹)" type="number" value={formData.odPremium ?? ""} onChange={(e) => handleChange("odPremium", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Hydraulic Jack Cover (₹)" type="number" value={formData.hydraulicJackCoverPremium ?? formData.hydraulicJackCover ?? formData.hydrolicJackCover ?? ""} onChange={(e) => { handleChange("hydraulicJackCoverPremium", e.target.value); handleChange("hydraulicJackCover", e.target.value); handleChange("hydrolicJackCover", e.target.value); }} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Moderation Amount (Tipper) (₹)" type="number" value={formData.moderationAmountTipper ?? formData.moderationAmount ?? ""} onChange={(e) => { handleChange("moderationAmountTipper", e.target.value); handleChange("moderationAmount", e.target.value); }} fullWidth size="small" />
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
            <TextField label="NCB Amount (₹)" type="number" value={formData.ncbAmount ?? formData.ncb ?? ""} onChange={(e) => { handleChange("ncbAmount", e.target.value); handleChange("ncb", e.target.value); }} fullWidth size="small" />
          </Grid>

          {renderCustomFields("section2BCustomFields")}

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Total OD Premium (₹)"
              type="number"
              value={formData.totalOdPremium ?? ""}
              onChange={(e) => handleChange("totalOdPremium", e.target.value)}
              fullWidth
              size="small"
              helperText="= OD + Jack + Moderation + IMT23/24/25 - NCB"
            />
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" color="primary">
            3. Renewed Policy Details
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => addCustomField("section3CustomFields")}
          >
            + Add Field (Section 3)
          </Button>
        </Box>
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

          <Grid item xs={12} sm={6} md={6}>
            <TextField
              label="Premium Amount (₹)"
              type="number"
              value={formData.newPremiumAmount ?? formData.newPremium ?? ""}
              onChange={(e) => {
                handleChange("newPremiumAmount", e.target.value);
                handleChange("newPremium", e.target.value);
              }}
              fullWidth
              size="small"
            />
          </Grid>

          {renderCustomFields("section3CustomFields")}

          <Grid item xs={12}>
            <TextField label="Remarks" multiline rows={2} value={formData.newRemarks ?? ""} onChange={(e) => handleChange("newRemarks", e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      {/* Renewed Insurance Premium Breakdown */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" color="primary">
            3B. Renewed Insurance Premium Breakdown
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => addCustomField("section3BCustomFields")}
          >
            + Add Field (Section 3B)
          </Button>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Granular premium breakdown for the renewed/new policy.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="OD Premium (₹) *" type="number" value={formData.newOdPremium ?? ""} onChange={(e) => handleChange("newOdPremium", e.target.value)} fullWidth size="small" required />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Hydraulic Jack Cover Premium (₹)" type="number" value={formData.newHydraulicJackCoverPremium ?? formData.newHydraulicJackCover ?? formData.newHydrolicJackCover ?? ""} onChange={(e) => { handleChange("newHydraulicJackCoverPremium", e.target.value); handleChange("newHydraulicJackCover", e.target.value); handleChange("newHydrolicJackCover", e.target.value); }} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Moderation Amount (Tipper) (₹)" type="number" value={formData.newModerationAmountTipper ?? formData.newModerationAmount ?? ""} onChange={(e) => { handleChange("newModerationAmountTipper", e.target.value); handleChange("newModerationAmount", e.target.value); }} fullWidth size="small" />
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
            <TextField label="NCB Amount (₹)" type="number" value={formData.newNcbAmount ?? formData.newNcb ?? ""} onChange={(e) => { handleChange("newNcbAmount", e.target.value); handleChange("newNcb", e.target.value); }} fullWidth size="small" />
          </Grid>

          {renderCustomFields("section3BCustomFields")}

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Total OD Premium (₹)"
              type="number"
              value={formData.newTotalOdPremium ?? ""}
              onChange={(e) => handleChange("newTotalOdPremium", e.target.value)}
              fullWidth
              size="small"
              helperText="= OD + Jack + Moderation + IMT23/24/25 - NCB"
            />
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
    </>
  );
}

export default React.memo(Stage1PolicyProposal);

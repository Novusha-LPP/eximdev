import React from "react";
import { Typography, Paper, Grid, TextField, Box, Button, InputAdornment, Alert, MenuItem, Chip } from "@mui/material";
import { Autorenew } from "@mui/icons-material";
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
                     (Number(formData.premiumAmount) > 0);
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
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Purchase Request Generation
      </Typography>

      {/* ─── PR Generation Readiness (moved from Stage 1) ─── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: "#fafafa" }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="secondary">
          PR Generation Readiness
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
                To enable <strong>Ready for PR Generation = Yes</strong>, please fill mandatory details in Policy Proposal (Stage 1):{" "}
                <strong>{missingFields.join(", ")}</strong>.
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {!isReady && (
        <Alert severity="info" sx={{ mb: 2 }}>
          PR Number generation is pending. Please set <strong>Ready for PR Generation?</strong> to <strong>Yes</strong> above to enable PR generation.
        </Alert>
      )}

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        PR Number is automatically generated in format <code>INS/01/AUG/2627</code>. PR Date defaults to today's date.
      </Typography>

      <Box sx={{ mb: 3, p: 2, backgroundColor: "#f8f9fa", borderRadius: 1 }}>
        <Typography variant="subtitle2">Total Policy Premium Required: ₹{formData.newTotalPolicyPremium || formData.totalPolicyPremium || 0}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField 
            label="PR Number" 
            value={formData.prNumber || ""} 
            onChange={(e) => handleChange("prNumber", e.target.value)} 
            disabled={!isReady}
            fullWidth 
            size="small" 
            helperText={isReady ? "Auto-generated format: INS/01/AUG/2627" : "Locked until Ready for PR Generation = Yes"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" onClick={handleGenerateNextPr} disabled={!isReady} startIcon={<Autorenew fontSize="small" />}>
                    Auto
                  </Button>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField 
            label="PR Date" 
            type="date" 
            InputLabelProps={{ shrink: true }} 
            value={formatDateValue(formData.prDate)} 
            onChange={(e) => {
              const newDate = e.target.value;
              handleChange("prDate", newDate);
            }} 
            disabled={!isReady}
            fullWidth 
            size="small" 
            helperText="Defaults to today's date"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default React.memo(Stage2PRGeneration);

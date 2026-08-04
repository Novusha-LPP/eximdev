import React from "react";
import { Typography, Paper, Grid, TextField, MenuItem, Box } from "@mui/material";

function Stage3FinanceApproval({ formData, handleChange }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Finance Approval
      </Typography>
      
      <Box sx={{ mb: 3, p: 2, backgroundColor: "#f8f9fa", borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="textSecondary">PR Number</Typography>
            <Typography variant="subtitle1" fontWeight="bold">{formData.prNumber || "N/A"}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="textSecondary">Insurance Company</Typography>
            <Typography variant="subtitle1" fontWeight="bold">{formData.newInsuranceCompany || formData.insuranceCompany || "-"}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="textSecondary">Renewal Total IDV Amount</Typography>
            <Typography variant="subtitle1" fontWeight="bold">₹ {Number(formData.newTotalIdv || formData.totalIdv || 0).toLocaleString("en-IN")}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="textSecondary">Requested Premium Amount</Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="primary">₹ {Number(formData.newTotalPolicyPremium || formData.totalPolicyPremium || formData.premiumQuote || 0).toLocaleString("en-IN")}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField 
            select 
            label="Financial Approval Status" 
            value={formData.financialApprovalStatus === "Draft" || !formData.financialApprovalStatus ? "Pending" : formData.financialApprovalStatus} 
            onChange={(e) => handleChange("financialApprovalStatus", e.target.value)} 
            fullWidth 
            size="small"
          >
            <MenuItem value="Pending">Pending Approval</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </TextField>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default React.memo(Stage3FinanceApproval);

import React from "react";
import { Typography, Paper, Grid, TextField, MenuItem, Box } from "@mui/material";

function Stage3FinanceApproval({ formData, handleChange }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Finance Approval
      </Typography>
      
      <Box sx={{ mb: 3, p: 2, backgroundColor: "#f8f9fa", borderRadius: 1 }}>
        <Typography variant="subtitle2">PR Number: {formData.prNumber || "N/A"}</Typography>
        <Typography variant="subtitle2">Requested Premium Amount: ₹{formData.totalPolicyPremium || formData.premiumQuote || 0}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField 
            select 
            label="Financial Approval Status" 
            value={formData.financialApprovalStatus || "Draft"} 
            onChange={(e) => handleChange("financialApprovalStatus", e.target.value)} 
            fullWidth 
            size="small"
          >
            <MenuItem value="Draft">Draft</MenuItem>
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

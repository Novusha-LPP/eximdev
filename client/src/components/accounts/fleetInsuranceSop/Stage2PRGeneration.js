import React from "react";
import { Typography, Paper, Grid, TextField, Box } from "@mui/material";

function Stage2PRGeneration({ formData, handleChange, formatDateValue }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Purchase Request Generation
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Enter the PR Number generated for this policy renewal. The required premium amount is shown below for reference.
      </Typography>

      <Box sx={{ mb: 3, p: 2, backgroundColor: "#f8f9fa", borderRadius: 1 }}>
        <Typography variant="subtitle2">Total Policy Premium Required: ₹{formData.totalPolicyPremium || 0}</Typography>
        <Typography variant="subtitle2">Premium Quote L1: ₹{formData.premiumQuote || 0}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField 
            label="PR Number" 
            value={formData.prNumber || ""} 
            onChange={(e) => handleChange("prNumber", e.target.value)} 
            fullWidth 
            size="small" 
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField 
            label="PR Date" 
            type="date" 
            InputLabelProps={{ shrink: true }} 
            value={formatDateValue(formData.prDate)} 
            onChange={(e) => handleChange("prDate", e.target.value)} 
            fullWidth 
            size="small" 
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default React.memo(Stage2PRGeneration);

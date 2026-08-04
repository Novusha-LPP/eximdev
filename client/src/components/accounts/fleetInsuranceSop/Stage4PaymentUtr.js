import React from "react";
import { Typography, Paper, Grid, TextField, MenuItem, Box } from "@mui/material";

function Stage4PaymentUtr({ formData, handleChange, formatDateValue }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        Payment & UTR Details
      </Typography>
      
      <Box sx={{ mb: 3, p: 2, backgroundColor: "#f8f9fa", borderRadius: 1 }}>
        <Typography variant="subtitle2">Financial Status: {formData.financialApprovalStatus === "Pending" ? "Pending Approval" : (formData.financialApprovalStatus || "Pending Approval")}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField 
            label="Payment UTR" 
            value={formData.paymentUtr || ""} 
            onChange={(e) => handleChange("paymentUtr", e.target.value)} 
            fullWidth 
            size="small" 
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField 
            label="Payment Date" 
            type="date" 
            InputLabelProps={{ shrink: true }} 
            value={formatDateValue(formData.paymentDate)} 
            onChange={(e) => handleChange("paymentDate", e.target.value)} 
            fullWidth 
            size="small" 
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField 
            select 
            label="Workflow Status" 
            value={formData.renewalStatus || "Pending"} 
            disabled 
            fullWidth 
            size="small" 
            onChange={(e) => handleChange("renewalStatus", e.target.value)}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Renewed">Renewed</MenuItem>
            <MenuItem value="Not Renewed">Not Renewed</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField 
            label="TAT (Days)" 
            value={formData.tat || ""} 
            disabled 
            fullWidth 
            size="small" 
            helperText="Calculated automatically from PR Date to Payment Date"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default React.memo(Stage4PaymentUtr);

import React from "react";
import { Typography, Paper, Grid, TextField, Box, Button, InputAdornment, Alert } from "@mui/material";
import { Autorenew } from "@mui/icons-material";
import axios from "axios";

function Stage2PRGeneration({ formData, handleChange, formatDateValue }) {
  const isReady = formData.readyForPr === "Yes";

  const handleGenerateNextPr = async () => {
    if (!isReady) {
      alert("Please select 'Ready for PR Generation? -> Yes' in Stage 1 (Policy Proposal) first.");
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
      
      {!isReady && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          PR Number generation is pending. Please set <strong>Ready for PR Generation?</strong> to <strong>Yes</strong> in <em>Stage 1 (Policy Proposal)</em> to enable PR generation.
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

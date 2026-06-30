import React from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Paper,
  MenuItem,
  Divider,
} from "@mui/material";

const yesNoOptions = ["Yes", "No"];
const decisionOptions = ["APPROVED", "REJECTED", "On Hold"];

function Stage3FinanceApproval({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const updateNested = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: value } });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Reference Information
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            label="PO Number"
            value={globalData?.poNumber || ""}
            onChange={() => {}}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="PO Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.poDate ? data.poDate.split("T")[0] : ""}
            onChange={(e) => updateField("poDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Selected Supplier (L1)"
            value={data.selectedSupplierL1 || ""}
            onChange={(e) => updateField("selectedSupplierL1", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Total Order Value (₹)"
            type="number"
            value={data.totalOrderValue || 0}
            onChange={(e) => updateField("totalOrderValue", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Purchase Officer Name"
            value={data.purchaseOfficerName || ""}
            onChange={(e) => updateField("purchaseOfficerName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Date Received by Finance"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.dateReceivedByFinance ? data.dateReceivedByFinance.split("T")[0] : ""}
            onChange={(e) => updateField("dateReceivedByFinance", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. Finance Review Checklist
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          {[
            ["1. Budget availability confirmed for this purchase", "budgetAvailable"],
            ["2. L1 supplier price is reasonable and within market range", "priceReasonable"],
            ["3. GST number of supplier verified", "gstVerified"],
            ["4. Payment terms reviewed and accepted", "paymentTermsAccepted"],
            ["5. Supporting documents (PR, Quotation Sheet) are attached", "docsAttached"],
          ].map(([label, field]) => (
            <Grid item xs={12} md={6} key={field} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2">{label}</Typography>
              <TextField
                select
                value={data.reviewChecklist?.[field] || ""}
                onChange={(e) => updateNested("reviewChecklist", field, e.target.value)}
                size="small"
                sx={{ width: 100 }}
              >
                {yesNoOptions.map((o) => (
                  <MenuItem key={o} value={o}>
                    {o}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        C. Finance Manager Decision
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            select
            label="Decision"
            value={data.decision?.decision || ""}
            onChange={(e) => updateNested("decision", "decision", e.target.value)}
            fullWidth
            size="small"
          >
            {decisionOptions.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField
            label="Remarks / Rejection Reason"
            value={data.decision?.remarksRejectionReason || ""}
            onChange={(e) => updateNested("decision", "remarksRejectionReason", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        D. Finance Manager Sign-Off
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            label="Finance Manager Name"
            value={data.signOff?.financeManagerName || ""}
            onChange={(e) => updateNested("signOff", "financeManagerName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Date of Approval"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.signOff?.dateOfApproval ? data.signOff.dateOfApproval.split("T")[0] : ""}
            onChange={(e) => updateNested("signOff", "dateOfApproval", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Signature / Digital Approval Ref"
            value={data.signOff?.signatureDigitalApprovalRef || ""}
            onChange={(e) => updateNested("signOff", "signatureDigitalApprovalRef", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Time of Approval"
            value={data.signOff?.timeOfApproval || ""}
            onChange={(e) => updateNested("signOff", "timeOfApproval", e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. 14:30"
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="textSecondary" display="block">
        * Once approved, this form is forwarded to the Accounting Team with supplier bank details for payment processing.
      </Typography>
    </Box>
  );
}

export default React.memo(Stage3FinanceApproval);

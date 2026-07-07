import React from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Divider,
  MenuItem,
} from "@mui/material";

const methodOptions = ["NEFT", "RTGS", "IMPS", "Cheque", "UPI"];
const sharingOptions = ["WhatsApp", "Email", "Call"];

function Stage4PaymentUtr({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const updateNested = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: value } });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Reference Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Number & Date"
            value={globalData?.poNumber || ""}
            onChange={() => {}}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Finance Approval Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.financeApprovalDate ? data.financeApprovalDate.split("T")[0] : ""}
            onChange={(e) => updateField("financeApprovalDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Supplier Name"
            value={data.supplierName || ""}
            onChange={(e) => updateField("supplierName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Total Payment Amount (₹)"
            type="number"
            value={data.totalPaymentAmount || 0}
            onChange={(e) => updateField("totalPaymentAmount", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. Supplier Bank Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Account Name"
            value={data.supplierBankDetails?.accountName || ""}
            onChange={(e) => updateNested("supplierBankDetails", "accountName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Bank Name"
            value={data.supplierBankDetails?.bankName || ""}
            onChange={(e) => updateNested("supplierBankDetails", "bankName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Account Number"
            value={data.supplierBankDetails?.accountNumber || ""}
            onChange={(e) => updateNested("supplierBankDetails", "accountNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="IFSC Code"
            value={data.supplierBankDetails?.ifscCode || ""}
            onChange={(e) => updateNested("supplierBankDetails", "ifscCode", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Account Type"
            value={data.supplierBankDetails?.accountType || ""}
            onChange={(e) => updateNested("supplierBankDetails", "accountType", e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. Current / Savings"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Branch"
            value={data.supplierBankDetails?.branch || ""}
            onChange={(e) => updateNested("supplierBankDetails", "branch", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="UPI / VPA (if any)"
            value={data.supplierBankDetails?.upiVpa || ""}
            onChange={(e) => updateNested("supplierBankDetails", "upiVpa", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        C. Payment Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            select
            label="Payment Method"
            value={data.paymentDetails?.paymentMethod || ""}
            onChange={(e) => updateNested("paymentDetails", "paymentMethod", e.target.value)}
            fullWidth
            size="small"
          >
            {methodOptions.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Payment Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.paymentDetails?.paymentDate ? data.paymentDetails.paymentDate.split("T")[0] : ""}
            onChange={(e) => updateNested("paymentDetails", "paymentDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Amount Paid (₹)"
            type="number"
            value={data.paymentDetails?.amountPaid || 0}
            onChange={(e) => updateNested("paymentDetails", "amountPaid", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Payment Reference / UTR No."
            value={data.paymentDetails?.paymentReferenceUtr || ""}
            onChange={(e) => updateNested("paymentDetails", "paymentReferenceUtr", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Bank / App Used for Transfer"
            value={data.paymentDetails?.bankAppUsed || ""}
            onChange={(e) => updateNested("paymentDetails", "bankAppUsed", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Time of Transfer"
            value={data.paymentDetails?.timeOfTransfer || ""}
            onChange={(e) => updateNested("paymentDetails", "timeOfTransfer", e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. 15:45"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        D. Accounting Team Sign-Off
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="Processed By (Name)"
            value={data.accountingSignOff?.processedByName || ""}
            onChange={(e) => updateNested("accountingSignOff", "processedByName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Designation"
            value={data.accountingSignOff?.designation || ""}
            onChange={(e) => updateNested("accountingSignOff", "designation", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Signature / Approval Ref"
            value={data.accountingSignOff?.signatureApprovalRef || ""}
            onChange={(e) => updateNested("accountingSignOff", "signatureApprovalRef", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Date Confirmed"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.accountingSignOff?.dateConfirmed ? data.accountingSignOff.dateConfirmed.split("T")[0] : ""}
            onChange={(e) => updateNested("accountingSignOff", "dateConfirmed", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        E. UTR Sharing
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="UTR Shared with Purchase Officer on"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.utrSharing?.utrSharedWithPoOn ? data.utrSharing.utrSharedWithPoOn.split("T")[0] : ""}
            onChange={(e) => updateNested("utrSharing", "utrSharedWithPoOn", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Mode of Sharing"
            value={data.utrSharing?.modeOfSharing || ""}
            onChange={(e) => updateNested("utrSharing", "modeOfSharing", e.target.value)}
            fullWidth
            size="small"
          >
            {sharingOptions.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="textSecondary" display="block">
        * Once UTR is confirmed and shared, the Purchase Officer is authorised to place the order with the selected supplier.
      </Typography>
    </Box>
  );
}

export default React.memo(Stage4PaymentUtr);

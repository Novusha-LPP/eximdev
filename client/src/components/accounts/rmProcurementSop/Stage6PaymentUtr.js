import React from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
} from "@mui/material";

const statusOptions = ["", "Pending", "Done"];

function Stage6PaymentUtr({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => onChange({ [field]: value });
  const updateNested = (group, field, value) =>
    onChange({ [group]: { ...data[group], [field]: value } });

  const actionLog = data.actionLog || [];
  const updateActionLog = (idx, field, value) => {
    const updated = [...actionLog];
    for (let i = 0; i <= idx; i++) {
      if (!updated[i]) {
        updated[i] = {
          actionTask: [
            "Payment processed and UTR recorded",
            "Payment confirmation intimated to Purchase Officer",
            "Purchase Officer authorised to place RM order",
          ][i] || "",
          responsiblePerson: [
            "Accounting Team",
            "Accounting Team",
            "System / Accounting",
          ][i] || "",
          dateTime: "",
          status: "",
        };
      }
    }
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ actionLog: updated });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        A. Reference Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="PR Number"
            value={globalData?.prNumber || ""}
            onChange={() => {}}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
          <TextField
            label="Supplier Name"
            value={data.supplierName || ""}
            onChange={(e) => updateField("supplierName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Total Payment Amount (₹)"
            type="number"
            value={data.totalPaymentAmount || ""}
            onChange={(e) => updateField("totalPaymentAmount", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        B. Supplier Bank Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Account Name", "accountName"],
          ["Bank Name", "bankName"],
          ["Account Number", "accountNumber"],
          ["IFSC Code", "ifscCode"],
          ["Account Type", "accountType"],
          ["Branch", "branch"],
          ["UPI / VPA", "upiVpa"],
        ].map(([label, field]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              label={label}
              value={data.supplierBankDetails?.[field] || ""}
              onChange={(e) => updateNested("supplierBankDetails", field, e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        C. Payment Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Payment Method"
            value={data.paymentDetails?.paymentMethod || ""}
            onChange={(e) => updateNested("paymentDetails", "paymentMethod", e.target.value)}
            fullWidth
            size="small"
            placeholder="NEFT / RTGS / IMPS / Cheque / UPI"
          />
        </Grid>
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
          <TextField
            label="Amount Paid (₹)"
            type="number"
            value={data.paymentDetails?.amountPaid || ""}
            onChange={(e) => updateNested("paymentDetails", "amountPaid", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="UTR / Transaction Reference No."
            value={data.paymentDetails?.utrReferenceNo || ""}
            onChange={(e) => updateNested("paymentDetails", "utrReferenceNo", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Bank / Platform Used"
            value={data.paymentDetails?.bankPlatformUsed || ""}
            onChange={(e) => updateNested("paymentDetails", "bankPlatformUsed", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Time of Transfer"
            value={data.paymentDetails?.timeOfTransfer || ""}
            onChange={(e) => updateNested("paymentDetails", "timeOfTransfer", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        D. Accounting Team Sign-Off
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Processed By (Name)", "processedByName"],
          ["Designation", "designation"],
          ["Signature / Approval Ref", "signatureApprovalRef"],
        ].map(([label, field]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              label={label}
              value={data.accountingSignOff?.[field] || ""}
              onChange={(e) => updateNested("accountingSignOff", field, e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        ))}
        <Grid item xs={12} md={6}>
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

      <Typography variant="subtitle1" gutterBottom>
        E. UTR Intimation to Purchase Officer
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="UTR Shared With Purchase Officer On"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.utrIntimation?.utrSharedWithPurchaseOfficerOn ? data.utrIntimation.utrSharedWithPurchaseOfficerOn.split("T")[0] : ""}
            onChange={(e) => updateNested("utrIntimation", "utrSharedWithPurchaseOfficerOn", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Mode of Sharing"
            value={data.utrIntimation?.modeOfSharing || ""}
            onChange={(e) => updateNested("utrIntimation", "modeOfSharing", e.target.value)}
            fullWidth
            size="small"
            placeholder="WhatsApp / Email / Call"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        Action Log
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Step</TableCell>
              <TableCell>Action / Task</TableCell>
              <TableCell>Responsible Person</TableCell>
              <TableCell>Date / Time</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Payment processed and UTR recorded", "Accounting Team"],
              ["Payment confirmation intimated to Purchase Officer", "Accounting Team"],
              ["Purchase Officer authorised to place RM order", "System / Accounting"],
            ].map(([task, person], idx) => (
              <TableRow key={idx}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <TextField
                    value={actionLog[idx]?.actionTask || task}
                    onChange={(e) => updateActionLog(idx, "actionTask", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={actionLog[idx]?.responsiblePerson || person}
                    onChange={(e) => updateActionLog(idx, "responsiblePerson", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    value={actionLog[idx]?.dateTime ? actionLog[idx].dateTime.slice(0, 16) : ""}
                    onChange={(e) => updateActionLog(idx, "dateTime", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={actionLog[idx]?.status || ""}
                    onChange={(e) => updateActionLog(idx, "status", e.target.value)}
                    size="small"
                    sx={{ minWidth: 90 }}
                  >
                    {statusOptions.map((o) => (
                      <MenuItem key={o || "empty"} value={o}>
                        {o || "Select"}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default React.memo(Stage6PaymentUtr);

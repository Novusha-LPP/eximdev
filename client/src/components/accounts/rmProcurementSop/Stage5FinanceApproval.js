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

const yesNoOptions = ["", "Yes", "No"];
const decisionOptions = ["", "APPROVED", "REJECTED", "On Hold"];
const statusOptions = ["", "Pending", "Done"];

function Stage5FinanceApproval({ data, onChange }) {
  const updateField = (field, value) => onChange({ [field]: value });
  const updateNested = (group, field, value) =>
    onChange({ [group]: { ...data[group], [field]: value } });

  const actionLog = data.actionLog || [];
  const updateActionLog = (idx, field, value) => {
    const updated = actionLog.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
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
            value={data.prNumber || ""}
            onChange={(e) => updateField("prNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Pricing Validation Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.pricingValidationDate ? data.pricingValidationDate.split("T")[0] : ""}
            onChange={(e) => updateField("pricingValidationDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Selected Supplier (L1)"
            value={data.selectedSupplierL1 || ""}
            onChange={(e) => updateField("selectedSupplierL1", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Total Order Value (₹)"
            type="number"
            value={data.totalOrderValue || ""}
            onChange={(e) => updateField("totalOrderValue", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Purchase Officer Name"
            value={data.purchaseOfficerName || ""}
            onChange={(e) => updateField("purchaseOfficerName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
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

      <Typography variant="subtitle1" gutterBottom>
        B. Finance Review Checklist
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Budget available for this raw material purchase", "budgetAvailable"],
          ["Pricing Team validation is attached and signed off", "pricingValidationAttached"],
          ["L1 supplier rate is within approved budget / benchmark", "l1RateWithinBudget"],
          ["Supplier GST number verified", "supplierGstVerified"],
          ["Payment terms are acceptable", "paymentTermsAcceptable"],
          ["Supporting documents are complete", "supportingDocumentsComplete"],
        ].map(([label, field]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              select
              label={label}
              value={data.reviewChecklist?.[field] || ""}
              onChange={(e) => updateNested("reviewChecklist", field, e.target.value)}
              fullWidth
              size="small"
            >
              {yesNoOptions.map((o) => (
                <MenuItem key={o || "empty"} value={o}>
                  {o || "Select"}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        C. Finance Manager Decision
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Decision"
            value={data.decision?.decision || ""}
            onChange={(e) => updateNested("decision", "decision", e.target.value)}
            fullWidth
            size="small"
          >
            {decisionOptions.map((o) => (
              <MenuItem key={o || "empty"} value={o}>
                {o || "Select"}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Remarks / Rejection Reason"
            value={data.decision?.remarksRejectionReason || ""}
            onChange={(e) => updateNested("decision", "remarksRejectionReason", e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        D. Finance Manager Sign-Off
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Finance Manager Name"
            value={data.signOff?.financeManagerName || ""}
            onChange={(e) => updateNested("signOff", "financeManagerName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
          <TextField
            label="Signature / Digital Approval Ref"
            value={data.signOff?.signatureDigitalApprovalRef || ""}
            onChange={(e) => updateNested("signOff", "signatureDigitalApprovalRef", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Time of Approval"
            value={data.signOff?.timeOfApproval || ""}
            onChange={(e) => updateNested("signOff", "timeOfApproval", e.target.value)}
            fullWidth
            size="small"
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
              ["Finance review checklist completed", "Finance Manager"],
              ["Purchase APPROVED / REJECTED decision recorded", "Finance Manager"],
              ["Forwarded to Accounting Team for payment processing", "Finance Manager"],
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

export default React.memo(Stage5FinanceApproval);

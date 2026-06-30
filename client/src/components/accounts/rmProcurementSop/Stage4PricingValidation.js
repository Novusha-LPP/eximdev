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
const resultOptions = ["", "VALIDATED", "QUERY RAISED"];
const statusOptions = ["", "Pending", "Done"];

function Stage4PricingValidation({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => onChange({ [field]: value });
  const updateNested = (group, field, value) =>
    onChange({ [group]: { ...data[group], [field]: value } });

  const validations = data.rateValidations || [];
  const updateValidation = (idx, field, value) => {
    const updated = [...validations];
    for (let i = 0; i <= idx; i++) {
      if (!updated[i]) {
        updated[i] = {
          rmType: [
            "Virgin HDPE Granule (ICOL-180M50)",
            "rHDPE Granule (Blue / Grey)",
            "Colour Masterbatch (Blue / Grey)",
            "UV Masterbatch",
          ][i] || "",
          l1QuotedRate: "",
          marketRate: "",
          acceptable: "",
          remarks: "",
        };
      }
    }
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ rateValidations: updated });
  };

  const actionLog = data.actionLog || [];
  const updateActionLog = (idx, field, value) => {
    const updated = [...actionLog];
    for (let i = 0; i <= idx; i++) {
      if (!updated[i]) {
        updated[i] = {
          actionTask: [
            "Rate validation completed against market benchmark",
            "Document checklist confirmed",
            "Forwarded to Finance Manager for approval",
          ][i] || "",
          responsiblePerson: [
            "Pricing Team",
            "Pricing Team",
            "Pricing Team",
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
            label="Date Received from PO"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.dateReceivedFromPo ? data.dateReceivedFromPo.split("T")[0] : ""}
            onChange={(e) => updateField("dateReceivedFromPo", e.target.value)}
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
            label="Pricing Team Member"
            value={data.pricingTeamMember || ""}
            onChange={(e) => updateField("pricingTeamMember", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Validation Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.validationDate ? data.validationDate.split("T")[0] : ""}
            onChange={(e) => updateField("validationDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        B. Rate Validation Table
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>RM Type</TableCell>
              <TableCell>L1 Quoted Rate (₹/kg)</TableCell>
              <TableCell>Market Rate / Last PO Rate (₹/kg)</TableCell>
              <TableCell>Variance (%)</TableCell>
              <TableCell>Acceptable?</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              "Virgin HDPE Granule (ICOL-180M50)",
              "rHDPE Granule (Blue / Grey)",
              "Colour Masterbatch (Blue / Grey)",
              "UV Masterbatch",
            ].map((rmType, idx) => {
              const quoted = Number(validations[idx]?.l1QuotedRate) || 0;
              const market = Number(validations[idx]?.marketRate) || 0;
              const variance = quoted > 0 && market > 0 ? (((quoted - market) / market) * 100).toFixed(2) : "";
              return (
                <TableRow key={idx}>
                  <TableCell>{rmType}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={validations[idx]?.l1QuotedRate || ""}
                      onChange={(e) => updateValidation(idx, "l1QuotedRate", e.target.value)}
                      size="small"
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={validations[idx]?.marketRate || ""}
                      onChange={(e) => updateValidation(idx, "marketRate", e.target.value)}
                      size="small"
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell>{variance}</TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={validations[idx]?.acceptable || ""}
                      onChange={(e) => updateValidation(idx, "acceptable", e.target.value)}
                      size="small"
                      sx={{ minWidth: 80 }}
                    >
                      {yesNoOptions.map((o) => (
                        <MenuItem key={o || "empty"} value={o}>
                          {o || "Select"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={validations[idx]?.remarks || ""}
                      onChange={(e) => updateValidation(idx, "remarks", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" gutterBottom>
        C. Overall Validation Checklist
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Rates compared against last 3 POs", "last3PoRatesCompared"],
          ["Market benchmark / index price verified", "marketBenchmarkVerified"],
          ["All required RM documents attached and verified", "rmDocumentsAttachedVerified"],
          ["Supplier GST and credentials checked", "supplierGstCredentialsChecked"],
          ["No abnormal deviation (>10%) without justification", "noAbnormalDeviation"],
        ].map(([label, field]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              select
              label={label}
              value={data.overallChecklist?.[field] || ""}
              onChange={(e) => updateNested("overallChecklist", field, e.target.value)}
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
        D. Pricing Team Decision
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Validation Result"
            value={data.decision?.validationResult || ""}
            onChange={(e) => updateNested("decision", "validationResult", e.target.value)}
            fullWidth
            size="small"
          >
            {resultOptions.map((o) => (
              <MenuItem key={o || "empty"} value={o}>
                {o || "Select"}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Validated By (Name)"
            value={data.decision?.validatedBy || ""}
            onChange={(e) => updateNested("decision", "validatedBy", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Remarks / Conditions"
            value={data.decision?.remarks || ""}
            onChange={(e) => updateNested("decision", "remarks", e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Signature / Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.decision?.signatureDate ? data.decision.signatureDate.split("T")[0] : ""}
            onChange={(e) => updateNested("decision", "signatureDate", e.target.value)}
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
              ["Rate validation completed against market benchmark", "Pricing Team"],
              ["Document checklist confirmed", "Pricing Team"],
              ["Forwarded to Finance Manager for approval", "Pricing Team"],
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

export default React.memo(Stage4PricingValidation);

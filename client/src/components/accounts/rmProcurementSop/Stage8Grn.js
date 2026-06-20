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
  Checkbox,
  FormControlLabel,
  MenuItem,
} from "@mui/material";

const yesNoOptions = ["", "Yes", "No"];
const conditionOptions = ["", "OK", "Damaged"];
const acceptRejectOptions = ["", "Accepted", "Rejected"];
const approvalStatusOptions = ["", "GRN Done", "PR Closed"];

function Stage8Grn({ data, onChange }) {
  const updateField = (field, value) => onChange({ [field]: value });
  const updateNested = (group, field, value) =>
    onChange({ [group]: { ...data[group], [field]: value } });

  const inspections = data.rmReceiptInspection || [];
  const getInitializedInspections = (targetIdx) => {
    const updated = [...inspections];
    for (let i = 0; i <= targetIdx; i++) {
      if (!updated[i]) {
        updated[i] = {
          rmType: [
            "Virgin HDPE Granule",
            "rHDPE Granule",
            "Colour Masterbatch",
            "UV Masterbatch",
          ][i] || "",
          grade: [
            "ICOL-180M50",
            "Blue / Grey",
            "Blue / Grey",
            "Standard UV",
          ][i] || "",
          orderedQty: "",
          receivedQty: "",
          physicalCondition: "",
          acceptedRejected: "",
          batchLotNo: "",
          documentsReceived: {},
        };
      }
    }
    return updated;
  };

  const updateInspection = (idx, field, value) => {
    const updated = getInitializedInspections(idx);
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ rmReceiptInspection: updated });
  };
  const updateInspectionDoc = (idx, doc, checked) => {
    const updated = getInitializedInspections(idx);
    updated[idx] = {
      ...updated[idx],
      documentsReceived: {
        ...(updated[idx].documentsReceived || {}),
        [doc]: checked,
      },
    };
    onChange({ rmReceiptInspection: updated });
  };

  const approvals = data.approvals || [];
  const updateApproval = (idx, field, value) => {
    const updated = [...approvals];
    for (let i = 0; i <= idx; i++) {
      if (!updated[i]) {
        updated[i] = {
          role: [
            "Received & Inspected By (QC / Store Manager)",
            "GRN Verified By (Production Head)",
            "PR Closed By (Purchase Officer)",
          ][i] || "",
          name: "",
          signature: "",
          date: "",
          status: "",
        };
      }
    }
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ approvals: updated });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        1. Reference & Delivery Information
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="GRN Number"
            value={data.grnNumber || ""}
            onChange={(e) => updateField("grnNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Date of Receipt"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.dateOfReceipt ? data.dateOfReceipt.split("T")[0] : ""}
            onChange={(e) => updateField("dateOfReceipt", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="PR Number (Reference)"
            value={data.prNumber || ""}
            onChange={(e) => updateField("prNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="PO / Order Reference No."
            value={data.poOrderReferenceNo || ""}
            onChange={(e) => updateField("poOrderReferenceNo", e.target.value)}
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
            label="Supplier Contact No."
            value={data.supplierContactNo || ""}
            onChange={(e) => updateField("supplierContactNo", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="LR / DC Number"
            value={data.lrDcNumber || ""}
            onChange={(e) => updateField("lrDcNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Invoice Number"
            value={data.invoiceNumber || ""}
            onChange={(e) => updateField("invoiceNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Vehicle Number"
            value={data.vehicleNumber || ""}
            onChange={(e) => updateField("vehicleNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="No. of Bags / Packages Received"
            value={data.noOfBagsPackagesReceived || ""}
            onChange={(e) => updateField("noOfBagsPackagesReceived", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        2. RM Receipt & Inspection Table
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>RM Type</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Ordered Qty (kg)</TableCell>
              <TableCell>Received Qty (kg)</TableCell>
              <TableCell>Shortage / Excess (kg)</TableCell>
              <TableCell>Physical Condition</TableCell>
              <TableCell>Accepted / Rejected</TableCell>
              <TableCell>Batch / Lot No.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Virgin HDPE Granule", "ICOL-180M50"],
              ["rHDPE Granule", "Blue / Grey"],
              ["Colour Masterbatch", "Blue / Grey"],
              ["UV Masterbatch", "Standard UV"],
            ].map(([rmType, grade], idx) => {
              const ordered = Number(inspections[idx]?.orderedQty) || 0;
              const received = Number(inspections[idx]?.receivedQty) || 0;
              const shortageExcess = received - ordered;
              return (
                <TableRow key={idx}>
                  <TableCell>{rmType}</TableCell>
                  <TableCell>{grade}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={inspections[idx]?.orderedQty || ""}
                      onChange={(e) => updateInspection(idx, "orderedQty", e.target.value)}
                      size="small"
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={inspections[idx]?.receivedQty || ""}
                      onChange={(e) => updateInspection(idx, "receivedQty", e.target.value)}
                      size="small"
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>{shortageExcess}</TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={inspections[idx]?.physicalCondition || ""}
                      onChange={(e) => updateInspection(idx, "physicalCondition", e.target.value)}
                      size="small"
                      sx={{ minWidth: 90 }}
                    >
                      {conditionOptions.map((o) => (
                        <MenuItem key={o || "empty"} value={o}>
                          {o || "Select"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={inspections[idx]?.acceptedRejected || ""}
                      onChange={(e) => updateInspection(idx, "acceptedRejected", e.target.value)}
                      size="small"
                      sx={{ minWidth: 90 }}
                    >
                      {acceptRejectOptions.map((o) => (
                        <MenuItem key={o || "empty"} value={o}>
                          {o || "Select"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={inspections[idx]?.batchLotNo || ""}
                      onChange={(e) => updateInspection(idx, "batchLotNo", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Documents Received
        </Typography>
        <Grid container spacing={2}>
          {[
            ["Virgin HDPE", "coa", "COA"],
            ["Virgin HDPE", "tds", "TDS"],
            ["Virgin HDPE", "mqd", "MQD"],
          ].map(([rm, key, label]) => (
            <Grid item xs={6} md={4} key={`${rm}-${key}`}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!inspections[0]?.documentsReceived?.[key]}
                    onChange={(e) => updateInspectionDoc(0, key, e.target.checked)}
                  />
                }
                label={`${rm} ${label}`}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Typography variant="subtitle1" gutterBottom>
        3. Document Verification Checklist
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Virgin HDPE Granule – COA received & verified", "virginHdpeCoa"],
          ["Virgin HDPE Granule – MSDS received", "virginHdpeMsds"],
          ["Virgin HDPE Granule – Manufacturer's Certificate received", "virginHdpeMfgCert"],
          ["Virgin HDPE Granule – Test Report matches PO specification", "virginHdpeTestReport"],
          ["rHDPE Granule – Material Quality Declaration received & verified", "rhdpeMqd"],
          ["Colour Masterbatch – Technical Data Sheet (TDS) received", "colourMasterbatchTds"],
          ["UV Masterbatch – Technical Data Sheet (TDS) received", "uvMasterbatchTds"],
          ["Invoice matches PO quantity and rate", "invoiceMatchesPo"],
          ["e-Way Bill received (if applicable)", "eWayBillReceived"],
        ].map(([label, field]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              select
              label={label}
              value={data.documentChecklist?.[field] || ""}
              onChange={(e) => updateNested("documentChecklist", field, e.target.value)}
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
        4. Quality Inspection Notes
      </Typography>
      <TextField
        value={data.qualityInspectionNotes || ""}
        onChange={(e) => updateField("qualityInspectionNotes", e.target.value)}
        fullWidth
        size="small"
        multiline
        rows={3}
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle1" gutterBottom>
        5. Return / Rejection Note (if any)
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <TextField
            label="RM to be Returned / Rejected"
            value={data.returnRejectionNote?.rmToBeReturnedRejected || ""}
            onChange={(e) => updateNested("returnRejectionNote", "rmToBeReturnedRejected", e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Action Taken / Supplier Notified On"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.returnRejectionNote?.actionTakenSupplierNotifiedOn ? data.returnRejectionNote.actionTakenSupplierNotifiedOn.split("T")[0] : ""}
            onChange={(e) => updateNested("returnRejectionNote", "actionTakenSupplierNotifiedOn", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Credit / Replacement Expected By"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.returnRejectionNote?.creditReplacementExpectedBy ? data.returnRejectionNote.creditReplacementExpectedBy.split("T")[0] : ""}
            onChange={(e) => updateNested("returnRejectionNote", "creditReplacementExpectedBy", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        6. GRN Approvals & PR Closure
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Role</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Signature</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              "Received & Inspected By (QC / Store Manager)",
              "GRN Verified By (Production Head)",
              "PR Closed By (Purchase Officer)",
            ].map((role, idx) => (
              <TableRow key={idx}>
                <TableCell>{role}</TableCell>
                <TableCell>
                  <TextField
                    value={approvals[idx]?.name || ""}
                    onChange={(e) => updateApproval(idx, "name", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={approvals[idx]?.signature || ""}
                    onChange={(e) => updateApproval(idx, "signature", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={approvals[idx]?.date ? approvals[idx].date.split("T")[0] : ""}
                    onChange={(e) => updateApproval(idx, "date", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={approvals[idx]?.status || ""}
                    onChange={(e) => updateApproval(idx, "status", e.target.value)}
                    size="small"
                    sx={{ minWidth: 100 }}
                  >
                    {approvalStatusOptions.map((o) => (
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

export default React.memo(Stage8Grn);

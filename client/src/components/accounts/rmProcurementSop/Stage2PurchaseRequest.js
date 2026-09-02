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

const decisionOptions = ["", "APPROVED", "REJECTED"];
const statusOptions = ["", "Pending", "Done"];

function Stage2PurchaseRequest({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => onChange({ [field]: value });
  const updateNested = (group, field, value) =>
    onChange({ [group]: { ...data[group], [field]: value } });

  const rawMaterials = data.rawMaterials || [];
  const updateMaterial = (idx, field, value) => {
    const updated = [...rawMaterials];
    for (let i = 0; i <= idx; i++) {
      if (!updated[i]) {
        updated[i] = {
          rmType: [
            "Virgin HDPE Granule",
            "rHDPE Granule (Recycled)",
            "Colour Masterbatch",
            "UV Masterbatch",
          ][i] || "",
          grade: [
            "ICOL - 180M50",
            "Blue / Grey Grade",
            "Blue / Grey",
            "Standard UV Grade",
          ][i] || "",
          requiredQty: "",
          unit: i < 4 ? "kg" : "",
          preferredSupplier: "",
          requiredCertificatesDocuments: [
            "COA, MSDS, Mfg Certificate, Test Report",
            "Material Quality Declaration",
            "Technical Data Sheet (TDS)",
            "Technical Data Sheet (TDS)",
          ][i] || "",
        };
      }
    }
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ rawMaterials: updated });
  };

  const actionLog = data.actionLog || [];
  const updateActionLog = (idx, field, value) => {
    const updated = [...actionLog];
    for (let i = 0; i <= idx; i++) {
      if (!updated[i]) {
        updated[i] = {
          actionTask: [
            "PR raised by factory person",
            "Reviewed & approved by Production Head",
            "PR forwarded to Purchase Officer",
          ][i] || "",
          responsiblePerson: [
            "Factory PR Person",
            "Production Head",
            "Production Head / PR Person",
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
        A. PR Identity
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="PR Number"
            value={globalData?.prNumber || ""}
            onChange={(e) => onGlobalChange("prNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="PR Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.prDate ? data.prDate.split("T")[0] : ""}
            onChange={(e) => updateField("prDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Raised By (Name)"
            value={data.raisedBy || ""}
            onChange={(e) => updateField("raisedBy", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Contact Number"
            value={data.contactNumber || ""}
            onChange={(e) => updateField("contactNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Sales Order Reference No."
            value={data.salesOrderRefNo || ""}
            onChange={(e) => updateField("salesOrderRefNo", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="RM Required By Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.rmRequiredByDate ? data.rmRequiredByDate.split("T")[0] : ""}
            onChange={(e) => updateField("rmRequiredByDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        B. Raw Materials Requested
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>S.No</TableCell>
              <TableCell>RM Type</TableCell>
              <TableCell>Grade / Specification</TableCell>
              <TableCell>Required Qty (kg)</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Preferred Supplier</TableCell>
              <TableCell>Required Certificates / Documents</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Virgin HDPE Granule", "ICOL - 180M50", "COA, MSDS, Mfg Certificate, Test Report"],
              ["rHDPE Granule (Recycled)", "Blue / Grey Grade", "Material Quality Declaration"],
              ["Colour Masterbatch", "Blue / Grey", "Technical Data Sheet (TDS)"],
              ["UV Masterbatch", "Standard UV Grade", "Technical Data Sheet (TDS)"],
            ].map(([rmType, grade, cert], idx) => (
              <TableRow key={idx}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{rmType}</TableCell>
                <TableCell>{grade}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={rawMaterials[idx]?.requiredQty || ""}
                    onChange={(e) => updateMaterial(idx, "requiredQty", e.target.value)}
                    size="small"
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.unit || "kg"}
                    onChange={(e) => updateMaterial(idx, "unit", e.target.value)}
                    size="small"
                    sx={{ width: 70 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.preferredSupplier || ""}
                    onChange={(e) => updateMaterial(idx, "preferredSupplier", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.requiredCertificatesDocuments || cert}
                    onChange={(e) => updateMaterial(idx, "requiredCertificatesDocuments", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </TableCell>
              </TableRow>
            ))}
            {[4, 5, 6].map((idx) => (
              <TableRow key={idx}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.rmType || ""}
                    onChange={(e) => updateMaterial(idx, "rmType", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.grade || ""}
                    onChange={(e) => updateMaterial(idx, "grade", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={rawMaterials[idx]?.requiredQty || ""}
                    onChange={(e) => updateMaterial(idx, "requiredQty", e.target.value)}
                    size="small"
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.unit || ""}
                    onChange={(e) => updateMaterial(idx, "unit", e.target.value)}
                    size="small"
                    sx={{ width: 70 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.preferredSupplier || ""}
                    onChange={(e) => updateMaterial(idx, "preferredSupplier", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rawMaterials[idx]?.requiredCertificatesDocuments || ""}
                    onChange={(e) => updateMaterial(idx, "requiredCertificatesDocuments", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" gutterBottom>
        C. Bin / Product Reference (from Sales Order)
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <TextField
            label="Bin / Crate Types Required"
            value={data.binProductReference?.binCrateTypesRequired || ""}
            onChange={(e) => updateNested("binProductReference", "binCrateTypesRequired", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Total Production Quantity"
            value={data.binProductReference?.totalProductionQuantity || ""}
            onChange={(e) => updateNested("binProductReference", "totalProductionQuantity", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Total Estimated RM Weight (kg)"
            value={data.binProductReference?.totalEstimatedRmWeight || ""}
            onChange={(e) => updateNested("binProductReference", "totalEstimatedRmWeight", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        D. Production Head Approval
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Production Head Name"
            value={data.productionHeadApproval?.productionHeadName || ""}
            onChange={(e) => updateNested("productionHeadApproval", "productionHeadName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Approval Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.productionHeadApproval?.approvalDate ? data.productionHeadApproval.approvalDate.split("T")[0] : ""}
            onChange={(e) => updateNested("productionHeadApproval", "approvalDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            select
            label="Approval Decision"
            value={data.productionHeadApproval?.approvalDecision || ""}
            onChange={(e) => updateNested("productionHeadApproval", "approvalDecision", e.target.value)}
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
            label="Remarks / Instructions"
            value={data.productionHeadApproval?.remarks || ""}
            onChange={(e) => updateNested("productionHeadApproval", "remarks", e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Signature / Approval Mode"
            value={data.productionHeadApproval?.signatureApprovalMode || ""}
            onChange={(e) => updateNested("productionHeadApproval", "signatureApprovalMode", e.target.value)}
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
              ["PR raised by factory person", "Factory PR Person"],
              ["Reviewed & approved by Production Head", "Production Head"],
              ["PR forwarded to Purchase Officer", "Production Head / PR Person"],
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

export default React.memo(Stage2PurchaseRequest);

import React from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  Paper,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
} from "@mui/material";

const yesNoOptions = ["", "Yes", "No"];
const statusOptions = ["", "Pending", "Done"];

function Stage3SupplierQuotation({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => onChange({ [field]: value });
  const getInitializedSuppliers = () => {
    const suppliers = data.suppliers || [];
    const updated = [...suppliers];
    while (updated.length < 3) {
      updated.push({ general: {} });
    }
    return updated;
  };

  const suppliers = getInitializedSuppliers();

  const updateSupplier = (idx, path, value) => {
    const currentSuppliers = getInitializedSuppliers();
    const updated = currentSuppliers.map((s, i) =>
      i === idx ? setPath({ ...s }, path, value) : s
    );
    onChange({ suppliers: updated });
  };

  const updateCheckbox = (field, checked) => {
    onChange({ documentsVerified: { ...data.documentsVerified, [field]: checked } });
  };

  const actionLog = data.actionLog || [];
  const updateActionLog = (idx, field, value) => {
    const updated = [...actionLog];
    for (let i = 0; i <= idx; i++) {
      if (!updated[i]) {
        updated[i] = {
          actionTask: [
            "Quotations collected (min 2–3 per RM type)",
            "Document checklist verified for L1 supplier",
            "Sent to Pricing Team for validation",
          ][i] || "",
          responsiblePerson: [
            "Purchase Officer",
            "Purchase Officer",
            "Purchase Officer",
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
            label="Comparison Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.comparisonDate ? data.comparisonDate.split("T")[0] : ""}
            onChange={(e) => updateField("comparisonDate", e.target.value)}
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
            label="Contact Number"
            value={data.contactNumber || ""}
            onChange={(e) => updateField("contactNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        B. Quotation Comparison Table
      </Typography>
      {[0, 1, 2].map((idx) => (
        <Paper key={idx} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Supplier {idx + 1}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Supplier Name"
                value={suppliers[idx].supplierName || ""}
                onChange={(e) => updateSupplier(idx, "supplierName", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Contact Person"
                value={suppliers[idx].contactPerson || ""}
                onChange={(e) => updateSupplier(idx, "contactPerson", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Phone / WhatsApp"
                value={suppliers[idx].phone || ""}
                onChange={(e) => updateSupplier(idx, "phone", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                value={suppliers[idx].email || ""}
                onChange={(e) => updateSupplier(idx, "email", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="GST Number"
                value={suppliers[idx].gstNumber || ""}
                onChange={(e) => updateSupplier(idx, "gstNumber", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Virgin HDPE Granule (ICOL-180M50)
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Rate/kg (₹)"
                type="number"
                value={suppliers[idx].virginHdpe?.ratePerKg || ""}
                onChange={(e) => updateSupplier(idx, "virginHdpe.ratePerKg", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Qty Available (kg)"
                type="number"
                value={suppliers[idx].virginHdpe?.qtyAvailable || ""}
                onChange={(e) => updateSupplier(idx, "virginHdpe.qtyAvailable", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Brand / Origin"
                value={suppliers[idx].virginHdpe?.brandOrigin || ""}
                onChange={(e) => updateSupplier(idx, "virginHdpe.brandOrigin", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Certificates Provided"
                value={suppliers[idx].virginHdpe?.certificatesProvided || ""}
                onChange={(e) => updateSupplier(idx, "virginHdpe.certificatesProvided", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                rHDPE Granule (Blue/Grey)
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Rate/kg (₹)"
                type="number"
                value={suppliers[idx].rhdpe?.ratePerKg || ""}
                onChange={(e) => updateSupplier(idx, "rhdpe.ratePerKg", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Material Quality Declaration Provided"
                value={suppliers[idx].rhdpe?.materialQualityDeclarationProvided || ""}
                onChange={(e) => updateSupplier(idx, "rhdpe.materialQualityDeclarationProvided", e.target.value)}
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

            <Grid item xs={12}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Colour Masterbatch (Blue/Grey)
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Rate/kg (₹)"
                type="number"
                value={suppliers[idx].colourMasterbatch?.ratePerKg || ""}
                onChange={(e) => updateSupplier(idx, "colourMasterbatch.ratePerKg", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="TDS Provided"
                value={suppliers[idx].colourMasterbatch?.tdsProvided || ""}
                onChange={(e) => updateSupplier(idx, "colourMasterbatch.tdsProvided", e.target.value)}
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

            <Grid item xs={12}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                UV Masterbatch
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Rate/kg (₹)"
                type="number"
                value={suppliers[idx].uvMasterbatch?.ratePerKg || ""}
                onChange={(e) => updateSupplier(idx, "uvMasterbatch.ratePerKg", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="TDS Provided"
                value={suppliers[idx].uvMasterbatch?.tdsProvided || ""}
                onChange={(e) => updateSupplier(idx, "uvMasterbatch.tdsProvided", e.target.value)}
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

            <Grid item xs={12}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                General
              </Typography>
            </Grid>
            {[
              ["Payment Terms", "general.paymentTerms"],
              ["Delivery Timeline", "general.deliveryTimeline"],
              ["Minimum Order Quantity", "general.minimumOrderQuantity"],
              ["Discount / Special Offer", "general.discountSpecialOffer"],
              ["Remarks", "general.remarks"],
            ].map(([label, path]) => (
              <Grid item xs={12} md={6} key={path}>
                <TextField
                  label={label}
                  value={getPath(suppliers[idx], path) || ""}
                  onChange={(e) => updateSupplier(idx, path, e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      ))}

      <Typography variant="subtitle1" gutterBottom>
        C. L1 Supplier Selection
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
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
            label="L1 Overall Rate (₹/kg)"
            type="number"
            value={data.l1OverallRate || ""}
            onChange={(e) => updateField("l1OverallRate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Reason for Selection"
            value={data.reasonForSelection || ""}
            onChange={(e) => updateField("reasonForSelection", e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Est. Total Order Value (₹)"
            type="number"
            value={data.estTotalOrderValue || ""}
            onChange={(e) => updateField("estTotalOrderValue", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Declaration"
            value={data.declaration || ""}
            onChange={(e) => updateField("declaration", e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Documents Verified?
        </Typography>
        <Grid container spacing={2}>
          {[
            ["coa", "COA"],
            ["msds", "MSDS"],
            ["mfgCert", "Mfg Cert"],
            ["materialQualityDecl", "Material Quality Decl"],
            ["tdsCm", "TDS (CM)"],
            ["tdsUv", "TDS (UV)"],
          ].map(([key, label]) => (
            <Grid item xs={6} md={4} key={key}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!data.documentsVerified?.[key]}
                    onChange={(e) => updateCheckbox(key, e.target.checked)}
                  />
                }
                label={label}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

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
              ["Quotations collected (min 2–3 per RM type)", "Purchase Officer"],
              ["Document checklist verified for L1 supplier", "Purchase Officer"],
              ["Sent to Pricing Team for validation", "Purchase Officer"],
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

function getPath(obj, path) {
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  target[last] = value;
  return obj;
}

export default React.memo(Stage3SupplierQuotation);

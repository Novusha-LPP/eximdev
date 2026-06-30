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
  IconButton,
  Button,
  MenuItem,
  Alert,
} from "@mui/material";
import { Add, Delete, CloudDownload } from "@mui/icons-material";

const approvalOptions = ["WhatsApp", "Phone Call", "Email", "In-Person"];
const tyreTypeOptions = ["New Tyre", "Remould Tyre"];

function Stage1PurchaseRequest({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const updateNested = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: value } });
  };

  const itemsRequired = data.itemsRequired || [];
  const routingChecklist = data.routingChecklist || [];

  const updateItem = (idx, field, value) => {
    const updated = itemsRequired.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    onChange({ itemsRequired: updated });
  };

  const addItem = () => {
    onChange({ itemsRequired: [...itemsRequired, { sNo: itemsRequired.length + 1, tyreType: "New Tyre" }] });
  };

  const removeItem = (idx) => {
    onChange({ itemsRequired: itemsRequired.filter((_, i) => i !== idx) });
  };

  const updateChecklist = (idx, field, value) => {
    const updated = routingChecklist.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    onChange({ routingChecklist: updated });
  };

  const handleMockPull = () => {
    onChange({
      prNumber: "TT-TYRE-2026-0042",
      prDate: new Date().toISOString().split("T")[0],
      preparedBy: "Jishnu",
      contactNumber: "+91 98765 43210",
      departmentLocation: "Logistics Hub - Delhi",
      neededByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      hodValidation: {
        validatedBy: "Mohit Singh",
        designation: "Fleet HOD",
        approvalMode: "WhatsApp",
        dateTimeOfApproval: new Date().toISOString().split("T")[0],
        hodSignature: "M.S.",
      },
      itemsRequired: [
        { sNo: 1, tyreType: "New Tyre", brandPreference: "MRF", sizeSpec: "10.00R20", loadRating: "146/143K", rimSize: "20", qty: 4, estUnitCost: 18500 },
        { sNo: 2, tyreType: "Remould Tyre", brandPreference: "Apollo", sizeSpec: "10.00R20", loadRating: "146/143K", rimSize: "20", qty: 6, estUnitCost: 9200 },
      ],
      specificationDetails: "Heavy load radial tyres. Cold remould spec required for trailer operations.",
      preferredSupplier: "Delhi Tyre Care",
      supplierContact: "info@delhityrecare.com",
      currentStockNew: 2,
      currentStockUsedRemould: 5,
      comments: "Urgent purchase request due to seasonal trailer servicing backlog.",
      routingChecklist: [
        { step: "Step 1", action: "PR Raised by Requester", responsible: "Operations Team", date: new Date().toISOString().split("T")[0], status: "Done" },
        { step: "Step 2", action: "Validated by HoD", responsible: "Head of Department", date: new Date().toISOString().split("T")[0], status: "Done" },
        { step: "Step 3", action: "Forwarded to Purchase Officer", responsible: "Purchase Officer", date: new Date().toISOString().split("T")[0], status: "Done" },
      ],
    });
  };

  // Compute total
  let totalCost = 0;
  itemsRequired.forEach((item) => {
    totalCost += (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
  });

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }} action={
        <Button color="inherit" size="small" startIcon={<CloudDownload />} onClick={handleMockPull}>
          Pull Transport Data
        </Button>
      }>
        <strong>Transport API Integration (Mock)</strong>: In production, Tyre Purchase Requests are fetched directly from the Fleet Management API. You can click "Pull Transport Data" to populate mock PR details.
      </Alert>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Purchase Request Identity
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            label="PR Number"
            value={globalData?.prNumber || ""}
            onChange={(e) => onGlobalChange("prNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
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
        <Grid item xs={12} md={4}>
          <TextField
            label="Needed By Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.neededByDate ? data.neededByDate.split("T")[0] : ""}
            onChange={(e) => updateField("neededByDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Prepared By (Name)"
            value={data.preparedBy || ""}
            onChange={(e) => updateField("preparedBy", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Contact Number"
            value={data.contactNumber || ""}
            onChange={(e) => updateField("contactNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Department / Location"
            value={data.departmentLocation || ""}
            onChange={(e) => updateField("departmentLocation", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. HoD Validation
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Validated By (HoD Name)"
            value={data.hodValidation?.validatedBy || ""}
            onChange={(e) => updateNested("hodValidation", "validatedBy", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Designation"
            value={data.hodValidation?.designation || ""}
            onChange={(e) => updateNested("hodValidation", "designation", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            select
            label="Approval Mode"
            value={data.hodValidation?.approvalMode || ""}
            onChange={(e) => updateNested("hodValidation", "approvalMode", e.target.value)}
            fullWidth
            size="small"
          >
            {approvalOptions.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Date & Time of Approval"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.hodValidation?.dateTimeOfApproval ? data.hodValidation.dateTimeOfApproval.split("T")[0] : ""}
            onChange={(e) => updateNested("hodValidation", "dateTimeOfApproval", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="HoD Signature / Initials"
            value={data.hodValidation?.hodSignature || ""}
            onChange={(e) => updateNested("hodValidation", "hodSignature", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        C. Items Required
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Tyre Type</TableCell>
              <TableCell>Brand Preference</TableCell>
              <TableCell>Size / Spec</TableCell>
              <TableCell>Load Rating</TableCell>
              <TableCell>Rim Size</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Est. Unit Cost (₹)</TableCell>
              <TableCell>Est. Total (₹)</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itemsRequired.map((item, idx) => {
              const total = (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
              return (
                <TableRow key={idx}>
                  <TableCell>
                    <TextField
                      select
                      value={item.tyreType || "New Tyre"}
                      onChange={(e) => updateItem(idx, "tyreType", e.target.value)}
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      {tyreTypeOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.brandPreference || ""}
                      onChange={(e) => updateItem(idx, "brandPreference", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.sizeSpec || ""}
                      onChange={(e) => updateItem(idx, "sizeSpec", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.loadRating || ""}
                      onChange={(e) => updateItem(idx, "loadRating", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.rimSize || ""}
                      onChange={(e) => updateItem(idx, "rimSize", e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={item.qty || ""}
                      onChange={(e) => updateItem(idx, "qty", e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={item.estUnitCost || ""}
                      onChange={(e) => updateItem(idx, "estUnitCost", e.target.value)}
                      size="small"
                      sx={{ width: 120 }}
                    />
                  </TableCell>
                  <TableCell>{total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="outlined" size="small" startIcon={<Add />} onClick={addItem} sx={{ mb: 3 }}>
        Add Tyre Line
      </Button>

      <Paper sx={{ p: 2, mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#fbe9e7" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          ESTIMATED TOTAL COST:
        </Typography>
        <Typography variant="h6" color="error" sx={{ fontWeight: "bold" }}>
          {totalCost.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
        </Typography>
      </Paper>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        D. Specification & Supplier Preference
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <TextField
            label="Specification Details"
            value={data.specificationDetails || ""}
            onChange={(e) => updateField("specificationDetails", e.target.value)}
            fullWidth
            size="small"
            placeholder="Brand, Load Rating, Rim Size, Remould Spec, etc."
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Preferred Supplier (if any)"
            value={data.preferredSupplier || ""}
            onChange={(e) => updateField("preferredSupplier", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Supplier Contact"
            value={data.supplierContact || ""}
            onChange={(e) => updateField("supplierContact", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        E. Current Stock Status
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Current Stock – New Tyres"
            type="number"
            value={data.currentStockNew || 0}
            onChange={(e) => updateField("currentStockNew", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Current Stock – Used / Remould"
            type="number"
            value={data.currentStockUsedRemould || 0}
            onChange={(e) => updateField("currentStockUsedRemould", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        F. Comments / Additional Information
      </Typography>
      <TextField
        value={data.comments || ""}
        onChange={(e) => updateField("comments", e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
        sx={{ mb: 3 }}
      />

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        G. Routing Checklist
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Step</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Responsible</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Step 1", "PR Raised by Requester", "Operations Team"],
              ["Step 2", "Validated by HoD", "Head of Department"],
              ["Step 3", "Forwarded to Purchase Officer", "Purchase Officer"],
            ].map(([step, action, resp], idx) => (
              <TableRow key={idx}>
                <TableCell>{step}</TableCell>
                <TableCell>{action}</TableCell>
                <TableCell>{resp}</TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={routingChecklist[idx]?.date ? routingChecklist[idx].date.split("T")[0] : ""}
                    onChange={(e) => updateChecklist(idx, "date", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={routingChecklist[idx]?.status || ""}
                    onChange={(e) => updateChecklist(idx, "status", e.target.value)}
                    size="small"
                    sx={{ minWidth: 100 }}
                  >
                    {["Pending", "Done"].map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
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

export default React.memo(Stage1PurchaseRequest);

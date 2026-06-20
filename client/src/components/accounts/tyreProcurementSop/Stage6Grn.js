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
  Button,
  Alert,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";

const yesNoOptions = ["Yes", "No"];
const acceptedOptions = ["Accepted", "Rejected"];
const typeOptions = ["New", "Remould"];

function Stage6Grn({ data, onChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const updateNested = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: value } });
  };

  const itemsReceived = data.itemsReceived || [];
  const approvals = data.approvals || [];

  const updateItem = (idx, field, value) => {
    const updated = itemsReceived.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    onChange({ itemsReceived: updated });
  };

  const updateApproval = (idx, field, value) => {
    const updated = approvals.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    onChange({ approvals: updated });
  };

  const handleMockGrn = () => {
    // Generate 10 mock tyre entries
    const mockItems = Array.from({ length: 10 }).map((_, i) => ({
      sNo: i + 1,
      tyreNumber: `TYR-2026-000${i + 147}`,
      tyreBrand: i % 2 === 0 ? "MRF" : "Apollo",
      sizeSpec: "10.00R20",
      type: i < 4 ? "New" : "Remould",
      hotStampDone: "Yes",
      photoTaken: "Yes",
      acceptedRejected: "Accepted",
      remarks: "Checked and stamps verified.",
    }));

    onChange({
      grnSeriesNo: "GRN-TT-2026-0034",
      dateOfReceipt: new Date().toISOString().split("T")[0],
      prNumber: data.prNumber || "TT-TYRE-2026-0042",
      poNumber: data.poNumber || "PO-9811A",
      supplierName: data.supplierName || "Delhi Tyre Care",
      supplierContactNo: "+91 99999 88888",
      deliveryNoteDcNo: "DC-67123",
      lrNumber: "LR-90812-A",
      vehicleNumber: "DL-01-GB-5643",
      deliveryLocation: "Delhi Warehouse Depot",
      itemsReceived: mockItems,
      qualityConformanceCheck: {
        tyresVerified: "Yes",
        tyreNumbersMatched: "Yes",
        hotStampingCompleted: "Yes",
        photosTaken: "Yes",
        invoiceVerified: "Yes",
        returnClauseReviewed: "Yes",
      },
      inspectionNotes: "All 10 radial tyres arrived in excellent condition. Serial numbers stamped and logged in inventory records.",
      approvals: [
        { role: "Received By (Site Person)", name: "Jishnu Kumar", date: new Date().toISOString().split("T")[0], signature: "J.K." },
        { role: "Validated by – Maintenance Manager", name: "Suresh P.", date: new Date().toISOString().split("T")[0], signature: "S.P." },
        { role: "Reviewed by – Purchase Officer", name: "Ajay Dev", date: new Date().toISOString().split("T")[0], signature: "A.D." },
      ],
    });
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }} action={
        <Button color="inherit" size="small" startIcon={<CheckCircle />} onClick={handleMockGrn}>
          Run Mock GRN Verification
        </Button>
      }>
        <strong>Transport/Fleet App Integration (Mock)</strong>: In production, Site GRNs are processed directly via the driver-app and warehouse scan endpoints. Click "Run Mock GRN Verification" to simulate successful delivery logs.
      </Alert>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        1. Reference & Delivery Information
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="GRN Series No."
            value={data.grnSeriesNo || ""}
            onChange={(e) => updateField("grnSeriesNo", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
          <TextField
            label="PR Number"
            value={data.prNumber || ""}
            onChange={(e) => updateField("prNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Number"
            value={data.poNumber || ""}
            onChange={(e) => updateField("poNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Supplier Name"
            value={data.supplierName || ""}
            onChange={(e) => updateField("supplierName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Supplier Contact No."
            value={data.supplierContactNo || ""}
            onChange={(e) => updateField("supplierContactNo", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Delivery Note / DC No."
            value={data.deliveryNoteDcNo || ""}
            onChange={(e) => updateField("deliveryNoteDcNo", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="LR Number"
            value={data.lrNumber || ""}
            onChange={(e) => updateField("lrNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Vehicle Number"
            value={data.vehicleNumber || ""}
            onChange={(e) => updateField("vehicleNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Delivery Location"
            value={data.deliveryLocation || ""}
            onChange={(e) => updateField("deliveryLocation", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        2. Items Received – Tyre-wise Entry (Up to 12 items)
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ width: 60 }}>S.No</TableCell>
              <TableCell>Tyre Number (Unique ID)</TableCell>
              <TableCell>Tyre Brand</TableCell>
              <TableCell>Size & Spec</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Hot Stamp?</TableCell>
              <TableCell>Photo?</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 12 }).map((_, idx) => {
              const item = itemsReceived[idx] || {};
              return (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <TextField
                      value={item.tyreNumber || ""}
                      onChange={(e) => updateItem(idx, "tyreNumber", e.target.value)}
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.tyreBrand || ""}
                      onChange={(e) => updateItem(idx, "tyreBrand", e.target.value)}
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.sizeSpec || ""}
                      onChange={(e) => updateItem(idx, "sizeSpec", e.target.value)}
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={item.type || "New"}
                      onChange={(e) => updateItem(idx, "type", e.target.value)}
                      size="small"
                      variant="standard"
                      sx={{ minWidth: 80 }}
                    >
                      {typeOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={item.hotStampDone || ""}
                      onChange={(e) => updateItem(idx, "hotStampDone", e.target.value)}
                      size="small"
                      variant="standard"
                      sx={{ minWidth: 60 }}
                    >
                      {yesNoOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={item.photoTaken || ""}
                      onChange={(e) => updateItem(idx, "photoTaken", e.target.value)}
                      size="small"
                      variant="standard"
                      sx={{ minWidth: 60 }}
                    >
                      {yesNoOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={item.acceptedRejected || ""}
                      onChange={(e) => updateItem(idx, "acceptedRejected", e.target.value)}
                      size="small"
                      variant="standard"
                      sx={{ minWidth: 100 }}
                    >
                      {acceptedOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={item.remarks || ""}
                      onChange={(e) => updateItem(idx, "remarks", e.target.value)}
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        3. Quality & Conformance Check
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          {[
            ["1. Tyres verified against PR / PO specifications (size, brand, quantity)", "tyresVerified"],
            ["2. Unique tyre numbers matched and recorded in register", "tyreNumbersMatched"],
            ["3. Hot tyre stamping completed for all received tyres", "hotStampingCompleted"],
            ["4. Photos taken and attached for each tyre", "photosTaken"],
            ["5. Invoice verified – quantity and value match with PO", "invoiceVerified"],
            ["6. Return clause reviewed – discrepancy noted for supplier action", "returnClauseReviewed"],
          ].map(([label, field]) => (
            <Grid item xs={12} md={6} key={field} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2">{label}</Typography>
              <TextField
                select
                value={data.qualityConformanceCheck?.[field] || ""}
                onChange={(e) => updateNested("qualityConformanceCheck", field, e.target.value)}
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
        4. Inspection Notes
      </Typography>
      <TextField
        value={data.inspectionNotes || ""}
        onChange={(e) => updateField("inspectionNotes", e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
        sx={{ mb: 3 }}
      />

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        5. Approvals & Sign-Off
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Role</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Signature / Initials</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              "Received By (Site Person)",
              "Validated by – Maintenance Manager",
              "Reviewed by – Purchase Officer",
            ].map((role, idx) => (
              <TableRow key={idx}>
                <TableCell sx={{ fontWeight: "500" }}>{role}</TableCell>
                <TableCell>
                  <TextField
                    value={approvals[idx]?.name || ""}
                    onChange={(e) => updateApproval(idx, "name", e.target.value)}
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
                    value={approvals[idx]?.signature || ""}
                    onChange={(e) => updateApproval(idx, "signature", e.target.value)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default React.memo(Stage6Grn);

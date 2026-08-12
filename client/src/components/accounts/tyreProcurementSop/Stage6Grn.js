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
  IconButton,
  Alert,
  Checkbox,
  Chip,
} from "@mui/material";
import { Add, Delete, CheckCircle } from "@mui/icons-material";

const yesNoOptions = ["Yes", "No"];
const acceptedOptions = ["Accepted", "Rejected"];
const typeOptions = ["New", "Remould"];

function Stage6Grn({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: typeof value === "string" ? value.toUpperCase() : value });
  };

  const updateNested = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: typeof value === "string" ? value.toUpperCase() : value } });
  };

  // Selected suppliers from Stage 2
  const stage2Suppliers = globalData?.stage2?.suppliers || [];
  const selectedSuppliers = globalData?.stage2?.selectedSuppliers || [];

  let awardedSuppliers = stage2Suppliers.filter((s) =>
    selectedSuppliers.some(
      (sel) => sel.selectedSupplier === s.supplierName || sel.selectedSupplier === s._id
    )
  );
  if (awardedSuppliers.length === 0) {
    awardedSuppliers = stage2Suppliers.length > 0 ? stage2Suppliers : [{ supplierName: "SUPPLIER 1" }];
  }

  // Per-supplier reference information list
  const referenceInfos = data.referenceInfos || [];

  const updateSupplierRefInfo = (idx, field, value) => {
    const updated = [...referenceInfos];
    const val = typeof value === "string" ? value.toUpperCase() : value;

    while (updated.length <= idx) {
      const sup = awardedSuppliers[updated.length] || {};
      const sd = globalData?.stage5?.supplierDispatches?.[updated.length] || {};
      const dd = sd.dispatchDetails || globalData?.stage5?.dispatchDetails || {};
      updated.push({
        supplierName: sup.supplierName || `SUPPLIER ${updated.length + 1}`,
        supplierContactNo: sup.phoneNumber || "",
        deliveryNoteDcNo: dd.dcNumber || "",
        lrNumber: dd.lrNumber || "",
        vehicleNumber: dd.vehicleNumber || "",
        deliveryLocation: sup.deliveryLocation || dd.deliveryLocationSite || "",
        invoiceDate: dd.invoiceDate || "",
      });
    }

    updated[idx] = { ...updated[idx], [field]: val };
    onChange({ referenceInfos: updated });
  };

  // Dynamic Items Received List
  const itemsReceived =
    data.itemsReceived && data.itemsReceived.length > 0
      ? data.itemsReceived
      : Array.from({ length: 4 }).map((_, i) => ({ sNo: i + 1, type: "New" }));

  const updateItem = (idx, field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;
    const updated = itemsReceived.map((item, i) => (i === idx ? { ...item, [field]: val } : item));
    onChange({ itemsReceived: updated });
  };

  const addItem = () => {
    const nextIdx = itemsReceived.length + 1;
    onChange({
      itemsReceived: [...itemsReceived, { sNo: nextIdx, type: "New", tyreBrand: "", sizeSpec: "" }],
    });
  };

  const removeItem = (idx) => {
    if (itemsReceived.length <= 1) return;
    const updated = itemsReceived.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sNo: i + 1 }));
    onChange({ itemsReceived: updated });
  };

  // Approvals & Sign-Off List
  const approvals = data.approvals || [
    { role: "Received By (Site Person)", name: "", date: "", signature: "" },
    { role: "Validated by – Maintenance Manager", name: "", date: "", signature: "" },
    { role: "Reviewed by – Purchase Officer", name: "", date: "", signature: "" },
  ];

  const updateApproval = (idx, field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;
    const current = approvals.length >= 3 ? [...approvals] : [
      { role: "Received By (Site Person)", name: "", date: "", signature: "" },
      { role: "Validated by – Maintenance Manager", name: "", date: "", signature: "" },
      { role: "Reviewed by – Purchase Officer", name: "", date: "", signature: "" },
    ];

    current[idx] = { ...current[idx], [field]: val };
    onChange({ approvals: current });

    // If Purchase Officer review (idx === 2) is updated with date or signature/name, advance status to "GRN Received"
    const poReview = current[2];
    if (poReview && (poReview.date || poReview.signature || poReview.name)) {
      if (onGlobalChange) onGlobalChange("status", "GRN Received");
    }
  };

  const handleApprovalToggle = (idx, checked) => {
    const today = new Date().toISOString().split("T")[0];
    const current = approvals.length >= 3 ? [...approvals] : [
      { role: "Received By (Site Person)", name: "", date: "", signature: "", status: "Pending" },
      { role: "Validated by – Maintenance Manager", name: "", date: "", signature: "", status: "Pending" },
      { role: "Reviewed by – Purchase Officer", name: "", date: "", signature: "", status: "Pending" },
    ];

    if (checked) {
      current[idx] = {
        ...current[idx],
        status: "Done",
        checked: true,
        date: current[idx]?.date || today,
      };
      if (idx === 2) {
        if (onGlobalChange) onGlobalChange("status", "GRN Received");
      }
    } else {
      current[idx] = {
        ...current[idx],
        status: "Pending",
        checked: false,
      };
    }
    onChange({ approvals: current });
  };

  const handleMockGrn = () => {
    const today = new Date().toISOString().split("T")[0];
    const mockItems = Array.from({ length: 10 }).map((_, i) => ({
      sNo: i + 1,
      tyreNumber: `TYR-2026-000${i + 147}`,
      tyreBrand: i % 2 === 0 ? "MRF" : "APOLLO",
      sizeSpec: "10.00R20",
      type: i < 4 ? "New" : "Remould",
      hotStampDone: "Yes",
      photoTaken: "Yes",
      acceptedRejected: "Accepted",
      remarks: "CHECKED AND VERIFIED.",
    }));

    onChange({
      grnSeriesNo: "GRN/TYRE/01/AUG/26-27",
      dateOfReceipt: today,
      itemsReceived: mockItems,
      qualityConformanceCheck: {
        tyresVerified: "Yes",
        tyreNumbersMatched: "Yes",
        invoiceVerified: "Yes",
        returnClauseReviewed: "Yes",
      },
      inspectionNotes: "ALL 10 TYRES RECEIVED IN GOOD CONDITION.",
      approvals: [
        { role: "Received By (Site Person)", name: "JISHNU KUMAR", date: today, signature: "J.K." },
        { role: "Validated by – Maintenance Manager", name: "SURESH P.", date: today, signature: "S.P." },
        { role: "Reviewed by – Purchase Officer", name: "AJAY DEV", date: today, signature: "A.D." },
      ],
    });
    if (onGlobalChange) onGlobalChange("status", "GRN Received");
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

      {/* ─── 1. Reference & Delivery Information ─── */}
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        1. Reference & Delivery Information
      </Typography>

      {/* Common GRN Header */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "#fafafa" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="GRN Series No. (Common)"
              value={data.grnSeriesNo || ""}
              onChange={(e) => updateField("grnSeriesNo", e.target.value.toUpperCase())}
              fullWidth
              size="small"
              placeholder="GRN/TYRE/01/AUG/26-27"
              InputProps={{ sx: { fontWeight: "bold", color: "#1e40af" } }}
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
              value={globalData?.prNumber || ""}
              InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="PO Number"
              value={globalData?.poNumber || ""}
              InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Per-Supplier Reference Information Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 220 }}>Supplier Field</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const supName = supObj.supplierName || `SUPPLIER ${idx + 1}`;
                return (
                  <TableCell key={idx} sx={{ fontWeight: "bold", color: "#1976d2", minWidth: 260 }}>
                    {supName}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Supplier Contact No */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Supplier Contact No.</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const info = referenceInfos[idx] || {};
                const val = info.supplierContactNo ?? (supObj.phoneNumber || data.supplierContactNo || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={val}
                      onChange={(e) => updateSupplierRefInfo(idx, "supplierContactNo", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Delivery Note / DC No */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Delivery Note / DC No.</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const info = referenceInfos[idx] || {};
                const sd = globalData?.stage5?.supplierDispatches?.[idx] || {};
                const val = info.deliveryNoteDcNo ?? (sd.dispatchDetails?.dcNumber || globalData?.stage5?.dispatchDetails?.dcNumber || data.deliveryNoteDcNo || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={val}
                      onChange={(e) => updateSupplierRefInfo(idx, "deliveryNoteDcNo", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* LR Number */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>LR Number</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const info = referenceInfos[idx] || {};
                const sd = globalData?.stage5?.supplierDispatches?.[idx] || {};
                const val = info.lrNumber ?? (sd.dispatchDetails?.lrNumber || globalData?.stage5?.dispatchDetails?.lrNumber || data.lrNumber || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={val}
                      onChange={(e) => updateSupplierRefInfo(idx, "lrNumber", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Vehicle Number */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Vehicle Number</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const info = referenceInfos[idx] || {};
                const sd = globalData?.stage5?.supplierDispatches?.[idx] || {};
                const val = info.vehicleNumber ?? (sd.dispatchDetails?.vehicleNumber || globalData?.stage5?.dispatchDetails?.vehicleNumber || data.vehicleNumber || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={val}
                      onChange={(e) => updateSupplierRefInfo(idx, "vehicleNumber", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Delivery Location */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Delivery Location</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const info = referenceInfos[idx] || {};
                const val = info.deliveryLocation ?? (supObj.deliveryLocation || data.deliveryLocation || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={val}
                      onChange={(e) => updateSupplierRefInfo(idx, "deliveryLocation", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── 2. Items Received – Tyre-wise Entry ─── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          2. Items Received – Tyre-wise Entry
        </Typography>
        <Button variant="outlined" size="small" startIcon={<Add />} onClick={addItem}>
          Add Item / Tyre
        </Button>
      </Box>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ width: 50 }}>#</TableCell>
              <TableCell>Tyre Number (Unique ID)</TableCell>
              <TableCell>Tyre Brand</TableCell>
              <TableCell>Size & Spec</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Remarks</TableCell>
              <TableCell align="center" sx={{ width: 60 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itemsReceived.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell sx={{ fontWeight: 500 }}>{idx + 1}</TableCell>
                <TableCell>
                  <TextField
                    value={item.tyreNumber || ""}
                    onChange={(e) => updateItem(idx, "tyreNumber", e.target.value)}
                    size="small"
                    variant="standard"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={item.tyreBrand || ""}
                    onChange={(e) => updateItem(idx, "tyreBrand", e.target.value)}
                    size="small"
                    variant="standard"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={item.sizeSpec || ""}
                    onChange={(e) => updateItem(idx, "sizeSpec", e.target.value)}
                    size="small"
                    variant="standard"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={item.type || "New"}
                    onChange={(e) => updateItem(idx, "type", e.target.value)}
                    size="small"
                    variant="standard"
                    sx={{ minWidth: 90 }}
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
                    value={item.acceptedRejected || ""}
                    onChange={(e) => updateItem(idx, "acceptedRejected", e.target.value)}
                    size="small"
                    variant="standard"
                    sx={{ minWidth: 110 }}
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
                    fullWidth
                  />
                </TableCell>
                <TableCell align="center">
                  {itemsReceived.length > 1 && (
                    <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── 3. Quality & Conformance Check ─── */}
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        3. Quality & Conformance Check
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          {[
            ["1. Tyres verified against PR / PO specifications (size, brand, quantity)", "tyresVerified"],
            ["2. Unique tyre numbers matched and recorded in register", "tyreNumbersMatched"],
            ["3. Invoice verified – quantity and value match with PO", "invoiceVerified"],
            ["4. Return clause reviewed – discrepancy noted for supplier action", "returnClauseReviewed"],
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

      {/* ─── 4. Inspection Notes ─── */}
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

      {/* ─── 5. Approvals & Sign-Off ─── */}
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        5. Approvals & Sign-Off
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ width: 80, fontWeight: "bold" }}>Check</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 180 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 120 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              "Received By (Site Person)",
              "Validated by – Maintenance Manager",
              "Reviewed by – Purchase Officer",
            ].map((role, idx) => {
              const item = approvals[idx] || {};
              const isChecked = item.status === "Done" || item.checked || Boolean(item.date);

              return (
                <TableRow key={idx} sx={idx === 2 ? { backgroundColor: "#f0f7ff" } : {}}>
                  <TableCell>
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => handleApprovalToggle(idx, e.target.checked)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: idx === 2 ? "bold" : "500", color: idx === 2 ? "#1e40af" : "inherit" }}>
                    {role} {idx === 2 ? "(Finalizes GRN Received)" : ""}
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={item.date ? item.date.split("T")[0] : ""}
                      onChange={(e) => updateApproval(idx, "date", e.target.value)}
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isChecked ? "Done" : "Pending"}
                      color={isChecked ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default React.memo(Stage6Grn);

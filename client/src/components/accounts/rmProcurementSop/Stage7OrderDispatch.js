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
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

function Stage7OrderDispatch({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => onChange({ [field]: value });
  const updateNested = (group, field, value) =>
    onChange({ [group]: { ...data[group], [field]: value } });

  const followUpLog = data.followUpLog || [];
  const updateFollowUp = (idx, field, value) => {
    const updated = followUpLog.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    onChange({ followUpLog: updated });
  };
  const addFollowUp = () => onChange({ followUpLog: [...followUpLog, {}] });
  const removeFollowUp = (idx) => onChange({ followUpLog: followUpLog.filter((_, i) => i !== idx) });

  const breakdown = data.rmDispatchBreakdown || [];
  const updateBreakdown = (idx, field, value) => {
    const updated = [...breakdown];
    for (let i = 0; i <= idx; i++) {
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
          qtyDispatchedKg: "",
          noOfBags: "",
          batchNo: "",
          remarks: "",
        };
      }
    }
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ rmDispatchBreakdown: updated });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        A. Order Reference
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
            label="UTR / Payment Reference"
            value={data.utrPaymentReference || ""}
            onChange={(e) => updateField("utrPaymentReference", e.target.value)}
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
            label="Order Placed By (PO Name)"
            value={data.orderPlacedBy || ""}
            onChange={(e) => updateField("orderPlacedBy", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Order Placed Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.orderPlacedDate ? data.orderPlacedDate.split("T")[0] : ""}
            onChange={(e) => updateField("orderPlacedDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Supplier Order Confirmation Ref."
            value={data.supplierOrderConfirmationRef || ""}
            onChange={(e) => updateField("supplierOrderConfirmationRef", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Confirmation Mode"
            value={data.confirmationMode || ""}
            onChange={(e) => updateField("confirmationMode", e.target.value)}
            fullWidth
            size="small"
            placeholder="WhatsApp / Email / Call"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        B. Delivery Timeline Follow-Up Log
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Date</TableCell>
              <TableCell>Follow-Up Mode</TableCell>
              <TableCell>Person Spoken To</TableCell>
              <TableCell>Supplier Update / Commitment</TableCell>
              <TableCell>Next Follow-Up Date</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {followUpLog.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <TextField
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={item.date ? item.date.split("T")[0] : ""}
                    onChange={(e) => updateFollowUp(idx, "date", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={item.followUpMode || ""}
                    onChange={(e) => updateFollowUp(idx, "followUpMode", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={item.personSpokenTo || ""}
                    onChange={(e) => updateFollowUp(idx, "personSpokenTo", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={item.supplierUpdateCommitment || ""}
                    onChange={(e) => updateFollowUp(idx, "supplierUpdateCommitment", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={item.nextFollowUpDate ? item.nextFollowUpDate.split("T")[0] : ""}
                    onChange={(e) => updateFollowUp(idx, "nextFollowUpDate", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => removeFollowUp(idx)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="outlined" size="small" startIcon={<Add />} onClick={addFollowUp} sx={{ mb: 2 }}>
        Add Follow-Up
      </Button>

      <Typography variant="subtitle1" gutterBottom>
        C. Dispatch Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Dispatch Date", "dispatchDate", "date"],
          ["Expected Delivery Date", "expectedDeliveryDate", "date"],
          ["Pick-Up / Loading Location", "pickUpLoadingLocation", "text"],
          ["Delivery Location (Factory/Store)", "deliveryLocation", "text"],
          ["LR Number (Lorry Receipt)", "lrNumber", "text"],
          ["DC Number (Delivery Challan)", "dcNumber", "text"],
          ["Invoice Number", "invoiceNumber", "text"],
          ["Invoice Amount (₹)", "invoiceAmount", "number"],
          ["Transport Company Name", "transportCompanyName", "text"],
          ["Transporter Contact No.", "transporterContactNo", "text"],
          ["Driver Name", "driverName", "text"],
          ["Driver Contact Number", "driverContactNumber", "text"],
          ["Vehicle Number", "vehicleNumber", "text"],
          ["No. of Bags / Packages Dispatched", "noOfBagsPackagesDispatched", "text"],
          ["Total Weight Dispatched (kg)", "totalWeightDispatchedKg", "number"],
          ["Material Tracking / e-Way Bill No.", "materialTrackingEWayBillNo", "text"],
        ].map(([label, field, type]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              label={label}
              type={type}
              InputLabelProps={type === "date" ? { shrink: true } : undefined}
              value={
                type === "date"
                  ? data.dispatchDetails?.[field]
                    ? data.dispatchDetails[field].split("T")[0]
                    : ""
                  : data.dispatchDetails?.[field] || ""
              }
              onChange={(e) => updateNested("dispatchDetails", field, e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        D. RM-wise Dispatch Breakdown
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>RM Type</TableCell>
              <TableCell>Grade / Specification</TableCell>
              <TableCell>Qty Dispatched (kg)</TableCell>
              <TableCell>No. of Bags</TableCell>
              <TableCell>Batch No.</TableCell>
              <TableCell>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Virgin HDPE Granule", "ICOL-180M50"],
              ["rHDPE Granule", "Blue / Grey"],
              ["Colour Masterbatch", "Blue / Grey"],
              ["UV Masterbatch", "Standard UV"],
            ].map(([rmType, grade], idx) => (
              <TableRow key={idx}>
                <TableCell>{rmType}</TableCell>
                <TableCell>{grade}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={breakdown[idx]?.qtyDispatchedKg || ""}
                    onChange={(e) => updateBreakdown(idx, "qtyDispatchedKg", e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={breakdown[idx]?.noOfBags || ""}
                    onChange={(e) => updateBreakdown(idx, "noOfBags", e.target.value)}
                    size="small"
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={breakdown[idx]?.batchNo || ""}
                    onChange={(e) => updateBreakdown(idx, "batchNo", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={breakdown[idx]?.remarks || ""}
                    onChange={(e) => updateBreakdown(idx, "remarks", e.target.value)}
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

export default React.memo(Stage7OrderDispatch);

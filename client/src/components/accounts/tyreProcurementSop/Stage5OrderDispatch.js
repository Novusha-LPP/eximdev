import React from "react";
import {
  Box,
  Grid,
  TextField,
  Typography,
  MenuItem,
  Divider,
} from "@mui/material";

const confirmationOptions = ["WhatsApp", "Email", "Call"];

function Stage5OrderDispatch({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const updateNested = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: value } });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Order Reference
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="PR Number"
            value={globalData?.prNumber || ""}
            onChange={() => {}}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Number (if applicable)"
            value={globalData?.poNumber || ""}
            onChange={() => {}}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Supplier Name"
            value={data.supplierName || ""}
            onChange={(e) => updateField("supplierName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="UTR Number (Payment Ref)"
            value={data.utrNumber || ""}
            onChange={(e) => updateField("utrNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Order Placed By (PO Name)"
            value={data.orderPlacedBy || ""}
            onChange={(e) => updateField("orderPlacedBy", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
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
        <Grid item xs={12} md={4}>
          <TextField
            label="Order Confirmation Reference"
            value={data.orderConfirmation || ""}
            onChange={(e) => updateField("orderConfirmation", e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. Confirmed on email"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            select
            label="Mode of Confirmation"
            value={data.modeOfConfirmation || ""}
            onChange={(e) => updateField("modeOfConfirmation", e.target.value)}
            fullWidth
            size="small"
          >
            {confirmationOptions.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. Dispatch Details (Updated once supplier dispatches material)
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Dispatch Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.dispatchDetails?.dispatchDate ? data.dispatchDetails.dispatchDate.split("T")[0] : ""}
            onChange={(e) => updateNested("dispatchDetails", "dispatchDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Expected Delivery Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.dispatchDetails?.expectedDeliveryDate ? data.dispatchDetails.expectedDeliveryDate.split("T")[0] : ""}
            onChange={(e) => updateNested("dispatchDetails", "expectedDeliveryDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Vehicle Number"
            value={data.dispatchDetails?.vehicleNumber || ""}
            onChange={(e) => updateNested("dispatchDetails", "vehicleNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Transporter Name"
            value={data.dispatchDetails?.transporterName || ""}
            onChange={(e) => updateNested("dispatchDetails", "transporterName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Delivery Location / Site"
            value={data.dispatchDetails?.deliveryLocationSite || ""}
            onChange={(e) => updateNested("dispatchDetails", "deliveryLocationSite", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Driver Name"
            value={data.dispatchDetails?.driverName || ""}
            onChange={(e) => updateNested("dispatchDetails", "driverName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Driver Contact Number"
            value={data.dispatchDetails?.driverContactNumber || ""}
            onChange={(e) => updateNested("dispatchDetails", "driverContactNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="DC Number (Delivery Challan)"
            value={data.dispatchDetails?.dcNumber || ""}
            onChange={(e) => updateNested("dispatchDetails", "dcNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="LR Number (Lorry Receipt)"
            value={data.dispatchDetails?.lrNumber || ""}
            onChange={(e) => updateNested("dispatchDetails", "lrNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="No. of Tyres Dispatched"
            type="number"
            value={data.dispatchDetails?.noOfTyresDispatched || 0}
            onChange={(e) => updateNested("dispatchDetails", "noOfTyresDispatched", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Invoice Number"
            value={data.dispatchDetails?.invoiceNumber || ""}
            onChange={(e) => updateNested("dispatchDetails", "invoiceNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Invoice Amount (₹)"
            type="number"
            value={data.dispatchDetails?.invoiceAmount || 0}
            onChange={(e) => updateNested("dispatchDetails", "invoiceAmount", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        C. Remarks / Tracking Notes
      </Typography>
      <TextField
        value={data.remarks || ""}
        onChange={(e) => updateField("remarks", e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
      />

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="textSecondary" display="block">
        * Once goods are received at the site, the concerned person will raise the GRN (Stage 6) to close this PR.
      </Typography>
    </Box>
  );
}

export default React.memo(Stage5OrderDispatch);

import React from "react";
import axios from "axios";
import {
  Box,
  TextField,
  Typography,
  MenuItem,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

const confirmationOptions = ["WhatsApp", "Email", "Call"];

function Stage5OrderDispatch({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: typeof value === "string" ? value.toUpperCase() : value });
  };

  // Get awarded suppliers from Stage 2
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

  const supplierDispatches = data.supplierDispatches || [];

  const updateSupplierDispatch = (index, field, value, subGroup = null) => {
    const updated = [...supplierDispatches];
    const val = typeof value === "string" ? value.toUpperCase() : value;

    // Ensure array is populated up to index
    while (updated.length <= index) {
      const sup = awardedSuppliers[updated.length] || {};
      const sp = globalData?.stage4?.supplierPayments?.[updated.length] || {};
      updated.push({
        supplierName: sup.supplierName || `SUPPLIER ${updated.length + 1}`,
        utrNumber: sp.utrNumber || globalData?.stage4?.paymentDetails?.paymentReferenceUtr || "",
        orderPlacedBy: globalData?.stage2?.purchaseOfficerName || data.orderPlacedBy || "",
        orderPlacedDate: data.orderPlacedDate || "",
        orderConfirmation: "",
        modeOfConfirmation: "WhatsApp",
        dispatchDetails: { ...data.dispatchDetails },
      });
    }

    if (subGroup) {
      updated[index] = {
        ...updated[index],
        [subGroup]: {
          ...(updated[index][subGroup] || {}),
          [field]: val,
        },
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: val,
      };
    }

    onChange({
      ...data,
      supplierDispatches: updated,
      supplierName: updated[0]?.supplierName || data.supplierName,
      utrNumber: updated[0]?.utrNumber || data.utrNumber,
      orderPlacedBy: updated[0]?.orderPlacedBy || data.orderPlacedBy,
      orderPlacedDate: updated[0]?.orderPlacedDate || data.orderPlacedDate,
      orderConfirmation: updated[0]?.orderConfirmation || data.orderConfirmation,
      modeOfConfirmation: updated[0]?.modeOfConfirmation || data.modeOfConfirmation,
      dispatchDetails: updated[0]?.dispatchDetails || data.dispatchDetails,
    });
  };

  const handleDispatchDoneToggle = async (checked) => {
    updateField("dispatchDone", checked);

    if (checked) {
      if (onGlobalChange) onGlobalChange("status", "Order Placed");

      // Auto-generate GRN series number if not already present
      if (!globalData?.stage6?.grnSeriesNo) {
        try {
          const today = new Date().toISOString().split("T")[0];
          const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/next-grn-number?date=${today}`);
          if (res.data?.success && res.data?.grnSeriesNo) {
            const grnNo = res.data.grnSeriesNo;
            if (onGlobalChange) {
              onGlobalChange("stage6", {
                ...(globalData?.stage6 || {}),
                grnSeriesNo: grnNo,
                dateOfReceipt: today,
              });
            }
          }
        } catch (err) {
          console.error("Error generating GRN Number on Dispatch Done:", err);
        }
      }
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Order & Dispatch Summary (Per Supplier)
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 220 }}>Field Name</TableCell>
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
            {/* PR & PO Number Reference */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>PR & PO Reference</TableCell>
              {awardedSuppliers.map((supObj, idx) => (
                <TableCell key={idx} sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  PR: {globalData?.prNumber || "-"} | PO: {globalData?.poNumber || "-"}
                </TableCell>
              ))}
            </TableRow>

            {/* UTR Number */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>UTR Number (Payment Ref)</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const spStage4 = globalData?.stage4?.supplierPayments?.[idx] || {};
                const utrVal = sdEntry.utrNumber ?? (spStage4.utrNumber || globalData?.stage4?.paymentDetails?.paymentReferenceUtr || data.utrNumber || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={utrVal}
                      onChange={(e) => updateSupplierDispatch(idx, "utrNumber", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Order Placed By */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Order Placed By</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const placedByVal = sdEntry.orderPlacedBy ?? (globalData?.stage2?.purchaseOfficerName || data.orderPlacedBy || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={placedByVal}
                      onChange={(e) => updateSupplierDispatch(idx, "orderPlacedBy", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Order Placed Date */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Order Placed Date</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const placedDateVal = sdEntry.orderPlacedDate ?? (data.orderPlacedDate || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={placedDateVal ? String(placedDateVal).split("T")[0] : ""}
                      onChange={(e) => updateSupplierDispatch(idx, "orderPlacedDate", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Order Confirmation Ref */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Order Confirmation Ref</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const confirmationVal = sdEntry.orderConfirmation ?? (data.orderConfirmation || "");

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={confirmationVal}
                      onChange={(e) => updateSupplierDispatch(idx, "orderConfirmation", e.target.value)}
                      placeholder="e.g. CONFIRMED ON EMAIL"
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Mode of Confirmation */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Mode of Confirmation</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const modeVal = sdEntry.modeOfConfirmation ?? (data.modeOfConfirmation || "WhatsApp");

                return (
                  <TableCell key={idx}>
                    <TextField
                      select
                      value={modeVal}
                      onChange={(e) => updateSupplierDispatch(idx, "modeOfConfirmation", e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    >
                      {confirmationOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Dispatch Date */}
            <TableRow sx={{ backgroundColor: "#f0f7ff" }}>
              <TableCell sx={{ fontWeight: "bold", color: "#1565c0" }}>Dispatch Date</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={dispatchObj.dispatchDate ? String(dispatchObj.dispatchDate).split("T")[0] : ""}
                      onChange={(e) => updateSupplierDispatch(idx, "dispatchDate", e.target.value, "dispatchDetails")}
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
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={dispatchObj.vehicleNumber || ""}
                      onChange={(e) => updateSupplierDispatch(idx, "vehicleNumber", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Transporter Name */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Transporter Name</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={dispatchObj.transporterName || ""}
                      onChange={(e) => updateSupplierDispatch(idx, "transporterName", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Driver Name */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Driver Name</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={dispatchObj.driverName || ""}
                      onChange={(e) => updateSupplierDispatch(idx, "driverName", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Driver Contact Number */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Driver Contact Number</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={dispatchObj.driverContactNumber || ""}
                      onChange={(e) => updateSupplierDispatch(idx, "driverContactNumber", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* DC Number */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>DC Number (Delivery Challan)</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={dispatchObj.dcNumber || ""}
                      onChange={(e) => updateSupplierDispatch(idx, "dcNumber", e.target.value, "dispatchDetails")}
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
              <TableCell sx={{ fontWeight: "500" }}>LR Number (Lorry Receipt)</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={dispatchObj.lrNumber || ""}
                      onChange={(e) => updateSupplierDispatch(idx, "lrNumber", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* No. of Tyres Dispatched */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>No. of Tyres Dispatched</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      type="number"
                      value={dispatchObj.noOfTyresDispatched || 0}
                      onChange={(e) => updateSupplierDispatch(idx, "noOfTyresDispatched", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Invoice Number */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Invoice Number</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      value={dispatchObj.invoiceNumber || ""}
                      onChange={(e) => updateSupplierDispatch(idx, "invoiceNumber", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Invoice Amount */}
            <TableRow>
              <TableCell sx={{ fontWeight: "500" }}>Invoice Amount (₹)</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                return (
                  <TableCell key={idx}>
                    <TextField
                      type="number"
                      value={dispatchObj.invoiceAmount || 0}
                      onChange={(e) => updateSupplierDispatch(idx, "invoiceAmount", e.target.value, "dispatchDetails")}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {/* Invoice Date */}
            <TableRow sx={{ backgroundColor: "#eef2ff" }}>
              <TableCell sx={{ fontWeight: "bold", color: "#1d4ed8" }}>Invoice Date (Used for Credit Terms)</TableCell>
              {awardedSuppliers.map((supObj, idx) => {
                const sdEntry = supplierDispatches[idx] || {};
                const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};
                const invDate = dispatchObj.invoiceDate || sdEntry.invoiceDate || "";

                return (
                  <TableCell key={idx}>
                    <TextField
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={invDate ? String(invDate).split("T")[0] : ""}
                      onChange={(e) => updateSupplierDispatch(idx, "invoiceDate", e.target.value, "dispatchDetails")}
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

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. Remarks / Tracking Notes
      </Typography>
      <TextField
        value={data.remarks || ""}
        onChange={(e) => updateField("remarks", e.target.value)}
        fullWidth
        multiline
        rows={3}
        size="small"
        sx={{ mb: 2 }}
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "#f0f7ff", borderColor: "#bfdbfe" }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(data.dispatchDone)}
              onChange={(e) => handleDispatchDoneToggle(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#1d4ed8" }}>
              Dispatch Done (Check to generate GRN Number and proceed to Site GRN)
            </Typography>
          }
        />
      </Paper>

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="textSecondary" display="block">
        * Once goods are received at the site, the concerned person will raise the GRN (Stage 6) to close this PR.
      </Typography>
    </Box>
  );
}

export default React.memo(Stage5OrderDispatch);

import React, { useEffect, useCallback } from "react";
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
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";

function Stage2SupplierQuotation({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const suppliers = data.suppliers || [{}, {}, {}];
  const routingChecklist = data.routingChecklist || [];

  const updateSupplierField = useCallback((index, field, value) => {
    const updatedSuppliers = suppliers.map((sup, idx) => {
      if (idx === index) {
        return { ...sup, [field]: value };
      }
      return sup;
    });
    onChange({ suppliers: updatedSuppliers });
  }, [suppliers, onChange]);

  const updateChecklist = (idx, field, value) => {
    const updated = routingChecklist.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    onChange({ routingChecklist: updated });
  };

  // Auto calculate values based on selected L1 supplier
  useEffect(() => {
    const sel = data.selectedSupplierL1;
    let index = -1;
    if (sel === "Supplier 1") index = 0;
    else if (sel === "Supplier 2") index = 1;
    else if (sel === "Supplier 3") index = 2;

    if (index !== -1) {
      const selectedSup = suppliers[index];
      const newPrice = Number(selectedSup?.unitPriceNew) || 0;
      const remouldPrice = Number(selectedSup?.unitPriceRemould) || 0;
      
      // L1 Price Quoted: take unit price new if greater than 0, otherwise remould price
      const l1Price = newPrice > 0 ? newPrice : remouldPrice;

      // Total Order Value estimation: (price * qty) + freight - discount
      const qtyAvailable = Number(selectedSup?.qtyAvailable) || 0;
      const freight = Number(selectedSup?.freightCharges) || 0;
      const discount = Number(selectedSup?.discountOffered) || 0;
      const totalVal = (l1Price * qtyAvailable) + freight - discount;

      // Only trigger onChange if values changed
      if (data.l1PriceQuoted !== l1Price || data.totalOrderValue !== totalVal) {
        onChange({
          l1PriceQuoted: l1Price,
          totalOrderValue: totalVal,
        });
      }
    }
  }, [data.selectedSupplierL1, suppliers, data.l1PriceQuoted, data.totalOrderValue, onChange]);

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Reference Details
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
            label="PO Number"
            value={globalData?.poNumber || ""}
            onChange={(e) => onGlobalChange("poNumber", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Purchase Officer Name"
            value={data.purchaseOfficerName || ""}
            onChange={(e) => updateField("purchaseOfficerName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.poDate ? data.poDate.split("T")[0] : ""}
            onChange={(e) => updateField("poDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. Supplier Details & Quotation
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 220 }}>Field</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Supplier 1</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Supplier 2</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Supplier 3</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Supplier Name", "supplierName", "text"],
              ["Contact Person", "contactPerson", "text"],
              ["Phone Number", "phoneNumber", "text"],
              ["Email / WhatsApp", "emailWhatsApp", "text"],
              ["GST Number", "gstNumber", "text"],
              ["Tyre Brand", "tyreBrand", "text"],
              ["Size & Specification", "sizeSpecification", "text"],
              ["Unit Price – New Tyre (₹)", "unitPriceNew", "number"],
              ["Unit Price – Remould Tyre (₹)", "unitPriceRemould", "number"],
              ["Qty Available", "qtyAvailable", "number"],
              ["Freight Charges", "freightCharges", "number"],
              ["Delivery Timeline", "deliveryTimeline", "text"],
              ["Delivery Location", "deliveryLocation", "text"],
              ["Warranty / Guarantee", "warrantyGuarantee", "text"],
              ["Payment Terms : Adv / Days", "paymentTerms", "text"],
              ["Discount Offered", "discountOffered", "number"],
              ["Remarks", "remarks", "text"],
            ].map(([label, field, type]) => (
              <TableRow key={field}>
                <TableCell sx={{ fontWeight: "500" }}>{label}</TableCell>
                {[0, 1, 2].map((idx) => (
                  <TableCell key={idx}>
                    <TextField
                      type={type}
                      value={suppliers[idx]?.[field] || ""}
                      onChange={(e) => updateSupplierField(idx, field, e.target.value)}
                      fullWidth
                      size="small"
                      variant="standard"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        C. L1 Supplier Selection (Lowest Qualified Bidder)
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Selected Supplier (L1)</InputLabel>
            <Select
              value={data.selectedSupplierL1 || ""}
              label="Selected Supplier (L1)"
              onChange={(e) => updateField("selectedSupplierL1", e.target.value)}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              <MenuItem value="Supplier 1">{suppliers[0]?.supplierName || "Supplier 1"}</MenuItem>
              <MenuItem value="Supplier 2">{suppliers[1]?.supplierName || "Supplier 2"}</MenuItem>
              <MenuItem value="Supplier 3">{suppliers[2]?.supplierName || "Supplier 3"}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="L1 Price Quoted (₹)"
            type="number"
            value={data.l1PriceQuoted || 0}
            onChange={(e) => updateField("l1PriceQuoted", e.target.value)}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Total Order Value (₹)"
            type="number"
            value={data.totalOrderValue || 0}
            onChange={(e) => updateField("totalOrderValue", e.target.value)}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Reason for Selection"
            value={data.reasonForSelection || ""}
            onChange={(e) => updateField("reasonForSelection", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Purchase Officer Declaration"
            value={data.declaration || "I confirm the above comparison is accurate and L1 selected on best value."}
            onChange={(e) => updateField("declaration", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        D. Routing Checklist
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
              ["Step 1", "Quotations collected (min. 3)", "Purchase Officer"],
              ["Step 2", "L1 Supplier selected", "Purchase Officer"],
              ["Step 3", "Sent to Finance Manager for approval", "Purchase Officer"],
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

export default React.memo(Stage2SupplierQuotation);

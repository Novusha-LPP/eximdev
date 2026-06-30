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
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

const bottomOptions = ["Flat", "Ribbed"];
const handleOptions = ["Open", "Close"];
const lidOptions = ["Yes", "No"];

function Stage1SalesOrder({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const updateNested = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: value } });
  };

  const productLines = data.productLines || [];
  const rmEstimates = data.rmEstimates || [];

  const updateProductLine = (idx, field, value) => {
    const updated = productLines.map((line, i) => (i === idx ? { ...line, [field]: value } : line));
    onChange({ productLines: updated });
  };

  const addProductLine = () => {
    onChange({ productLines: [...productLines, { sNo: productLines.length + 1 }] });
  };

  const removeProductLine = (idx) => {
    onChange({ productLines: productLines.filter((_, i) => i !== idx) });
  };

  const updateRmEstimate = (idx, field, value) => {
    const updated = [...rmEstimates];
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
          unit: "kg",
          currentStock: "",
          netRmToPurchase: "",
        };
      }
    }
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ rmEstimates: updated });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        A. Customer Order Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Customer Name"
            value={data.customerName || ""}
            onChange={(e) => updateField("customerName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Customer Contact / PO No."
            value={data.customerContactPoNo || ""}
            onChange={(e) => updateField("customerContactPoNo", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Order Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.orderDate ? data.orderDate.split("T")[0] : ""}
            onChange={(e) => updateField("orderDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Required Delivery Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.requiredDeliveryDate ? data.requiredDeliveryDate.split("T")[0] : ""}
            onChange={(e) => updateField("requiredDeliveryDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Sales Person Name"
            value={data.salesPersonName || ""}
            onChange={(e) => updateField("salesPersonName", e.target.value)}
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
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        B. Product / Bin Specifications Required
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>S.No</TableCell>
              <TableCell>Product Type</TableCell>
              <TableCell>Bin Size (mm)</TableCell>
              <TableCell>Bottom</TableCell>
              <TableCell>Handle</TableCell>
              <TableCell>Lid</TableCell>
              <TableCell>Colour</TableCell>
              <TableCell>Qty Ordered</TableCell>
              <TableCell>Est. Unit Wt (kg)</TableCell>
              <TableCell>Total Est. Wt (kg)</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productLines.map((line, idx) => {
              const total = (Number(line.qtyOrdered) || 0) * (Number(line.estUnitWeight) || 0);
              return (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <TextField
                      value={line.productType || ""}
                      onChange={(e) => updateProductLine(idx, "productType", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={line.binSize || ""}
                      onChange={(e) => updateProductLine(idx, "binSize", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={line.bottomType || ""}
                      onChange={(e) => updateProductLine(idx, "bottomType", e.target.value)}
                      size="small"
                      sx={{ minWidth: 80 }}
                    >
                      {bottomOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={line.handleType || ""}
                      onChange={(e) => updateProductLine(idx, "handleType", e.target.value)}
                      size="small"
                      sx={{ minWidth: 80 }}
                    >
                      {handleOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      value={line.lidRequired || ""}
                      onChange={(e) => updateProductLine(idx, "lidRequired", e.target.value)}
                      size="small"
                      sx={{ minWidth: 70 }}
                    >
                      {lidOptions.map((o) => (
                        <MenuItem key={o} value={o}>
                          {o}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={line.colour || ""}
                      onChange={(e) => updateProductLine(idx, "colour", e.target.value)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={line.qtyOrdered || ""}
                      onChange={(e) => updateProductLine(idx, "qtyOrdered", e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={line.estUnitWeight || ""}
                      onChange={(e) => updateProductLine(idx, "estUnitWeight", e.target.value)}
                      size="small"
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>{total.toFixed(2)}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => removeProductLine(idx)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="outlined" size="small" startIcon={<Add />} onClick={addProductLine} sx={{ mb: 2 }}>
        Add Product Line
      </Button>

      <Typography variant="subtitle1" gutterBottom>
        C. Raw Material Estimation
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>RM Type</TableCell>
              <TableCell>Grade / Specification</TableCell>
              <TableCell>Required Qty (kg)</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Current Stock (kg)</TableCell>
              <TableCell>Net RM to Purchase (kg)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Virgin HDPE Granule", "ICOL - 180M50"],
              ["rHDPE Granule (Recycled)", "Blue / Grey Grade"],
              ["Colour Masterbatch", "Blue / Grey"],
              ["UV Masterbatch", "Standard UV Grade"],
            ].map(([rmType, grade], idx) => (
              <TableRow key={idx}>
                <TableCell>{rmType}</TableCell>
                <TableCell>{grade}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={rmEstimates[idx]?.requiredQty || ""}
                    onChange={(e) => updateRmEstimate(idx, "requiredQty", e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={rmEstimates[idx]?.unit || "kg"}
                    onChange={(e) => updateRmEstimate(idx, "unit", e.target.value)}
                    size="small"
                    sx={{ width: 70 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={rmEstimates[idx]?.currentStock || ""}
                    onChange={(e) => updateRmEstimate(idx, "currentStock", e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={rmEstimates[idx]?.netRmToPurchase || ""}
                    onChange={(e) => updateRmEstimate(idx, "netRmToPurchase", e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" gutterBottom>
        D. Partition Details (if applicable)
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Bin / Crate Size (L×W×H)", "binCrateSize"],
          ["No. of Partitions", "noOfPartitions"],
          ["Partition Size (L×W)", "partitionSize"],
          ["No. of Pocket Partitions", "noOfPocketPartitions"],
          ["Partition Material / Colour", "partitionMaterialColour"],
          ["Special Instructions", "specialInstructions"],
        ].map(([label, field]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              label={label}
              value={data.partitionDetails?.[field] || ""}
              onChange={(e) => updateNested("partitionDetails", field, e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        E. Production Timeline
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Estimated Production Start Date", "estProductionStartDate"],
          ["Estimated Completion Date", "estCompletionDate"],
          ["Production Head Intimated On", "productionHeadIntimatedOn"],
          ["RM Required By Date", "rmRequiredByDate"],
        ].map(([label, field]) => (
          <Grid item xs={12} md={6} key={field}>
            <TextField
              label={label}
              type="date"
              InputLabelProps={{ shrink: true }}
              value={data.productionTimeline?.[field] ? data.productionTimeline[field].split("T")[0] : ""}
              onChange={(e) => updateNested("productionTimeline", field, e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        F. Sign-Off
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Sales Person Signature / Name"
            value={data.signOff?.salesPersonSignatureName || ""}
            onChange={(e) => updateNested("signOff", "salesPersonSignatureName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Sales Person Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.signOff?.salesPersonDate ? data.signOff.salesPersonDate.split("T")[0] : ""}
            onChange={(e) => updateNested("signOff", "salesPersonDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Reviewed by Production Head"
            value={data.signOff?.reviewedByProductionHead || ""}
            onChange={(e) => updateNested("signOff", "reviewedByProductionHead", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Production Head Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data.signOff?.productionHeadDate ? data.signOff.productionHeadDate.split("T")[0] : ""}
            onChange={(e) => updateNested("signOff", "productionHeadDate", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default React.memo(Stage1SalesOrder);

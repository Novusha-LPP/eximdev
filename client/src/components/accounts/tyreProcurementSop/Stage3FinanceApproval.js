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
  Checkbox,
  Chip,
  Divider,
} from "@mui/material";
import PoLandscapePdfGenerator from "./PoLandscapePdfGenerator";

function Stage3FinanceApproval({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: value });
  };

  const isApproved =
    data.decision?.decision === "APPROVED" ||
    globalData?.status === "Finance Approved" ||
    globalData?.status === "Payment Done" ||
    globalData?.status === "Order Placed" ||
    globalData?.status === "GRN Done" ||
    globalData?.status === "Closed";

  const approvalDate = data.signOff?.dateOfApproval
    ? data.signOff.dateOfApproval.split("T")[0]
    : "";
  const approvalTime = data.signOff?.timeOfApproval || "";

  // Fetch all selected suppliers from Stage 2 (or fallback to Stage 3 / L1)
  const stage2Selected = globalData?.stage2?.selectedSuppliers;
  const selectedSuppliers =
    stage2Selected && stage2Selected.length > 0
      ? stage2Selected
      : [
          {
            selectedSupplier: data.selectedSupplierL1 || globalData?.stage2?.selectedSupplierL1 || "",
            priceQuoted: globalData?.stage2?.l1PriceQuoted || 0,
            totalOrderValue: data.totalOrderValue || globalData?.stage2?.totalOrderValue || 0,
            reasonForSelection: globalData?.stage2?.reasonForSelection || "",
          },
        ];

  const overallTotalOrderValue = selectedSuppliers.reduce(
    (acc, item) => acc + (Number(item.totalOrderValue) || 0),
    0
  );

  const handleToggleApproval = (checked) => {
    if (checked) {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });

      onChange({
        ...data,
        selectedSupplierL1: selectedSuppliers[0]?.selectedSupplier || "",
        totalOrderValue: overallTotalOrderValue,
        decision: {
          ...(data.decision || {}),
          decision: "APPROVED",
        },
        signOff: {
          ...(data.signOff || {}),
          dateOfApproval: today,
          timeOfApproval: timeStr,
        },
      });

      if (onGlobalChange) {
        onGlobalChange("status", "Finance Approved");
      }
    } else {
      onChange({
        ...data,
        decision: {
          ...(data.decision || {}),
          decision: "Pending",
        },
        signOff: {
          ...(data.signOff || {}),
          dateOfApproval: "",
          timeOfApproval: "",
        },
      });

      if (onGlobalChange) {
        onGlobalChange("status", "Quotation Received");
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          A. Reference Information
        </Typography>
        <PoLandscapePdfGenerator globalData={globalData} stage3Data={data} />
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Number"
            value={globalData?.poNumber || data.poNumber || "-"}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Date"
            value={
              data.poDate || globalData?.stage2?.poDate
                ? new Date(data.poDate || globalData?.stage2?.poDate).toLocaleDateString("en-GB")
                : "-"
            }
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Purchase Officer Name"
            value={data.purchaseOfficerName || globalData?.stage2?.purchaseOfficerName || "-"}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Date Received by Finance"
            value={
              data.dateReceivedByFinance || globalData?.stage2?.routingChecklist?.[0]?.date
                ? new Date(data.dateReceivedByFinance || globalData?.stage2?.routingChecklist?.[0]?.date).toLocaleDateString("en-GB")
                : "-"
            }
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      {/* ─── Selected / Awarded Supplier(s) Static Table ─── */}
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. Awarded / Selected Supplier(s) Summary
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 50 }}>#</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Selected Supplier</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Price Quoted (₹)</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Total Order Value (₹)</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Reason for Selection</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Download PO</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedSuppliers.map((sup, idx) => (
              <TableRow key={idx}>
                <TableCell sx={{ fontWeight: 500 }}>{idx + 1}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#1976d2" }}>
                  {sup.selectedSupplier || "Not Specified"}
                </TableCell>
                <TableCell>₹{(Number(sup.priceQuoted) || 0).toLocaleString("en-IN")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  ₹{(Number(sup.totalOrderValue) || 0).toLocaleString("en-IN")}
                </TableCell>
                <TableCell>{sup.reasonForSelection || "N/A"}</TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  <PoLandscapePdfGenerator
                    globalData={globalData}
                    stage3Data={data}
                    targetSupplier={sup}
                    buttonLabel="PO PDF"
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: "#eef2ff" }}>
              <TableCell colSpan={3} sx={{ fontWeight: "bold", textAlign: "right" }}>
                OVERALL TOTAL ORDER VALUE (₹):
              </TableCell>
              <TableCell colSpan={3} sx={{ fontWeight: "bold", color: "#1e40af", fontSize: "0.95rem" }}>
                ₹{overallTotalOrderValue.toLocaleString("en-IN")}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        C. Finance Approval Checklist
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: 80 }}>Check</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Step</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Responsible</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Date Completed</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Time Completed</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <Checkbox
                  checked={isApproved}
                  onChange={(e) => handleToggleApproval(e.target.checked)}
                  color="primary"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>Step 1</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>Approved by Finance Manager</TableCell>
              <TableCell>Finance Manager</TableCell>
              <TableCell>{approvalDate || "-"}</TableCell>
              <TableCell>{approvalTime || "-"}</TableCell>
              <TableCell>
                <Chip
                  label={isApproved ? "Approved" : "Pending"}
                  color={isApproved ? "success" : "default"}
                  size="small"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="textSecondary" display="block">
        * Checking the approval box automatically records approval date & time and forwards the entry to Stage 4 (Payment & UTR).
      </Typography>
    </Box>
  );
}

export default React.memo(Stage3FinanceApproval);

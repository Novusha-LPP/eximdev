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
  Checkbox,
  Chip,
  Alert,
  AlertTitle,
} from "@mui/material";

const methodOptions = ["NEFT", "RTGS", "IMPS", "Cheque", "UPI"];

function parseCreditDays(terms) {
  if (!terms) return 0;
  const str = String(terms).toUpperCase();
  if (str.includes("ADVANCE") || str.includes("ADV")) return 0;
  const match = str.match(/(\d+)\s*(DAY|DAYS)?/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}

function Stage4PaymentUtr({ data, onChange, globalData, onGlobalChange }) {
  const stage2Suppliers = globalData?.stage2?.suppliers || [];
  const selectedSuppliers = globalData?.stage2?.selectedSuppliers || [];

  // Filter awarded suppliers from Stage 2
  let bankSuppliers = stage2Suppliers.filter((s) =>
    selectedSuppliers.some(
      (sel) => sel.selectedSupplier === s.supplierName || sel.selectedSupplier === s._id
    )
  );

  if (bankSuppliers.length === 0) {
    bankSuppliers = stage2Suppliers;
  }

  // Calculate total payment amount from Stage 2 / Stage 3
  const totalPaymentAmount =
    selectedSuppliers.length > 0
      ? selectedSuppliers.reduce((acc, s) => acc + (Number(s.totalOrderValue) || 0), 0)
      : globalData?.stage2?.totalOrderValue || data.totalPaymentAmount || 0;

  const supplierNamesStr =
    selectedSuppliers.length > 0
      ? selectedSuppliers.map((s) => s.selectedSupplier).filter(Boolean).join(", ")
      : globalData?.stage2?.selectedSupplierL1 || data.supplierName || "-";

  const financeApprovalDateObj =
    globalData?.stage3?.signOff?.dateOfApproval
      ? new Date(globalData.stage3.signOff.dateOfApproval)
      : data.financeApprovalDate
      ? new Date(data.financeApprovalDate)
      : new Date();

  const financeApprovalDateStr = financeApprovalDateObj.toLocaleDateString("en-GB");

  // Get current supplierPayments state array
  const supplierPayments = data.supplierPayments || [];

  const handleSupplierPaymentChange = (index, field, value) => {
    const today = new Date().toISOString().split("T")[0];
    const updated = [...supplierPayments];

    while (updated.length <= index) {
      const sup = bankSuppliers[updated.length] || {};
      const cDays = parseCreditDays(sup.paymentTerms);
      updated.push({
        supplierName: sup.supplierName || `Supplier ${updated.length + 1}`,
        paymentTerms: sup.paymentTerms || "100% ADVANCE",
        paymentMethod: "NEFT",
        utrNumber: "",
        paymentDate: today,
        isPaid: false,
        creditDays: cDays,
      });
    }

    const val = typeof value === "string" ? value.toUpperCase() : value;
    updated[index] = {
      ...updated[index],
      [field]: val,
      ...(field === "isPaid" && value && !updated[index].paymentDate ? { paymentDate: today } : {}),
    };

    const newAllPaid = updated.length > 0 && updated.every((sp) => sp.isPaid && sp.utrNumber?.trim());

    onChange({
      ...data,
      supplierPayments: updated,
    });

    if (newAllPaid && onGlobalChange) {
      onGlobalChange("status", "Payment Done");
    }
  };

  // Build credit warnings array for suppliers with credit terms (calculated from Invoice Date)
  const creditWarnings = [];
  bankSuppliers.forEach((sup, idx) => {
    const cDays = parseCreditDays(sup.paymentTerms);
    if (cDays > 0) {
      const invDateStr =
        globalData?.stage6?.referenceInfos?.[idx]?.invoiceDate ||
        globalData?.stage5?.supplierDispatches?.[idx]?.dispatchDetails?.invoiceDate ||
        globalData?.stage5?.dispatchDetails?.invoiceDate;

      const baseDate = invDateStr ? new Date(invDateStr) : financeApprovalDateObj;
      const dueDate = new Date(baseDate.getTime() + cDays * 24 * 60 * 60 * 1000);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const spEntry = supplierPayments[idx] || {};

      if (!spEntry.isPaid) {
        creditWarnings.push({
          supplierName: sup.supplierName || `Supplier ${idx + 1}`,
          creditDays: cDays,
          baseDateStr: baseDate.toLocaleDateString("en-GB"),
          usedInvoiceDate: Boolean(invDateStr),
          dueDateStr: dueDate.toLocaleDateString("en-GB"),
          diffDays,
          isUrgent: diffDays <= 7,
        });
      }
    }
  });

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        A. Reference Details
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="PO Number"
            value={globalData?.poNumber || ""}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Finance Approval Date"
            value={financeApprovalDateStr}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Supplier Name(s)"
            value={supplierNamesStr}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#f5f5f5" } }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Total Payment Amount (₹)"
            value={totalPaymentAmount ? `₹${totalPaymentAmount.toLocaleString("en-IN")}` : "₹0"}
            InputProps={{ readOnly: true, sx: { backgroundColor: "#eef2ff", fontWeight: "bold" } }}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      {/* ─── Credit Days Notifications / Warnings ─── */}
      {creditWarnings.map((cw, i) => (
        <Alert
          key={i}
          severity={cw.isUrgent ? "warning" : "info"}
          sx={{ mb: 2, fontWeight: 500 }}
        >
          <AlertTitle sx={{ fontWeight: "bold" }}>
            {cw.isUrgent
              ? `⚠️ Credit Payment Reminder: ${cw.supplierName}`
              : `ℹ️ Credit Payment Terms Active: ${cw.supplierName}`}
          </AlertTitle>
          Payment Terms: <strong>{cw.creditDays} Days Credit</strong> (Counted from {cw.usedInvoiceDate ? "Invoice Date" : "Approval Date"}: {cw.baseDateStr}).
          {" "}Due Date: <strong>{cw.dueDateStr}</strong> ({cw.diffDays > 0 ? `${cw.diffDays} days remaining` : "Due today / overdue"}).
          {" "}<em>This entry skips Stage 4 payment waiting and moves straight to Stage 5 Order & Dispatch.</em>
        </Alert>
      ))}

      {/* ─── B. Supplier Bank Details & Payment Table ─── */}
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
        B. Supplier Bank & Payment Details
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold" }}>Supplier Name</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Name in Bank</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Bank Name</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Account Number</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>IFSC Code</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Branch Code</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Payment Terms</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 130 }}>Payment Amount (₹)</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 140 }}>Payment Method</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 160 }}>UTR / Ref No.</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 150 }}>Payment Date</TableCell>
              <TableCell sx={{ fontWeight: "bold", width: 80 }} align="center">Payment Done?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bankSuppliers.length > 0 ? (
              bankSuppliers.map((sup, idx) => {
                const sp = supplierPayments[idx] || {};
                const cDays = parseCreditDays(sup.paymentTerms);
                const isCredit = cDays > 0;
                const termsLabel = sup.paymentTerms || (isCredit ? `${cDays} Days Credit` : "100% ADVANCE");

                const matchedSelected = selectedSuppliers.find(
                  (sel) => sel.selectedSupplier === sup.supplierName || sel.selectedSupplier === sup._id
                );
                const supplierOrderVal = matchedSelected?.totalOrderValue || sup.totalOrderValue || 0;

                return (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontWeight: 600, color: "#1976d2" }}>
                      {sup.supplierName || `Supplier ${idx + 1}`}
                    </TableCell>
                    <TableCell>{sup.supplierNameInBank || sup.supplierName || "-"}</TableCell>
                    <TableCell>{sup.bankName || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{sup.bankAccountNo || "-"}</TableCell>
                    <TableCell>{sup.bankIfscCode || "-"}</TableCell>
                    <TableCell>{sup.bankBranchCode || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={termsLabel}
                        size="small"
                        color={isCredit ? "warning" : "default"}
                        variant={isCredit ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                      {supplierOrderVal > 0 ? `₹${Number(supplierOrderVal).toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={sp.paymentMethod || "NEFT"}
                        onChange={(e) => handleSupplierPaymentChange(idx, "paymentMethod", e.target.value)}
                        fullWidth
                        size="small"
                      >
                        {methodOptions.map((m) => (
                          <MenuItem key={m} value={m}>
                            {m}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        placeholder="Enter UTR No."
                        value={sp.utrNumber || ""}
                        onChange={(e) => handleSupplierPaymentChange(idx, "utrNumber", e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={sp.paymentDate ? String(sp.paymentDate).split("T")[0] : ""}
                        onChange={(e) => handleSupplierPaymentChange(idx, "paymentDate", e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={Boolean(sp.isPaid)}
                        onChange={(e) => handleSupplierPaymentChange(idx, "isPaid", e.target.checked)}
                        color="success"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ color: "text.secondary", py: 3 }}>
                  No bank details provided in Stage 2 Supplier Quotation.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default React.memo(Stage4PaymentUtr);

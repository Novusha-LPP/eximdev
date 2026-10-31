import React from "react";
import {
  Box,
  Typography,
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
  let bankSuppliers = stage2Suppliers.filter((s) => {
    const sName = (s.supplierName || "").toUpperCase();
    return selectedSuppliers.some((sel) => {
      const selName = (sel.selectedSupplier || "").toUpperCase();
      return selName === sName || String(sel.selectedSupplier) === String(s._id);
    });
  });

  if (bankSuppliers.length === 0 && selectedSuppliers.length === 0) {
    bankSuppliers = stage2Suppliers;
  }

  // Calculate total payment amount from Stage 2 / Stage 3
  const totalPaymentAmount =
    selectedSuppliers.length > 0
      ? selectedSuppliers.reduce((acc, s) => acc + (Number(s.totalOrderValue) || 0), 0)
      : globalData?.stage2?.totalOrderValue || data.totalPaymentAmount || 0;

  const allReqItems = globalData?.stage1?.itemsRequired || [];
  const totalCancelledAmount = allReqItems
    .filter((it) => it.isCancelled)
    .reduce((sum, it) => sum + (Number(it.estTotalCost) || (Number(it.qty || 1) * Number(it.estUnitCost || 0))), 0);
  const netPayableAmount = Math.max(0, totalPaymentAmount - totalCancelledAmount);

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
    const currentUtr = field === "utrNumber" ? (val || "").trim() : (updated[index].utrNumber || "").trim();

    let newIsPaid = updated[index].isPaid;

    if (field === "utrNumber") {
      // Auto-select Paid checkbox if UTR is entered; uncheck if cleared
      newIsPaid = Boolean(val && val.trim());
    } else if (field === "isPaid") {
      // Do not allow selecting paid if no UTR is present
      if (!currentUtr) {
        newIsPaid = false;
      } else {
        newIsPaid = Boolean(value);
      }
    }

    updated[index] = {
      ...updated[index],
      [field]: val,
      isPaid: newIsPaid,
      ...(newIsPaid && !updated[index].paymentDate ? { paymentDate: today } : {}),
    };

    const newAllPaid = updated.length > 0 && updated.every((sp) => sp.isPaid && sp.utrNumber?.trim());

    onChange({
      ...data,
      supplierPayments: updated,
    });

    if (onGlobalChange) {
      if (newAllPaid) {
        onGlobalChange("status", "Payment Done");
      } else if (globalData?.status === "Payment Done" || globalData?.status === "Paid") {
        onGlobalChange("status", "Finance Approved");
      }
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
    <Box className="sop-container">
      {/* ─── A. Reference Details ─── */}
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Reference Details
        </Typography>
        <Box className="sop-grid-4">
          <Box>
            <label className="sop-label">PO NUMBER</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={globalData?.poNumber || "-"}
            />
          </Box>
          <Box>
            <label className="sop-label">FINANCE APPROVAL DATE</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={financeApprovalDateStr}
            />
          </Box>
          <Box>
            <label className="sop-label">SUPPLIER NAME(S)</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={supplierNamesStr}
            />
          </Box>
          <Box>
            <label className="sop-label">
              {totalCancelledAmount > 0 ? "NET PAYABLE AMOUNT (₹)" : "TOTAL PAYMENT AMOUNT (₹)"}
            </label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              style={{ fontWeight: "bold", color: "#1e3a8a" }}
              value={netPayableAmount ? `₹${netPayableAmount.toLocaleString("en-IN")}` : "₹0"}
            />
            {totalCancelledAmount > 0 && (
              <Typography variant="caption" sx={{ color: "#dc2626", fontSize: "10px", fontWeight: 600, display: "block", mt: 0.3 }}>
                (Original ₹{totalPaymentAmount.toLocaleString("en-IN")} - ₹{totalCancelledAmount.toLocaleString("en-IN")} cancelled)
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* ─── Credit Days Notifications / Warnings ─── */}
      {creditWarnings.map((cw, i) => (
        <Alert
          key={i}
          severity={cw.isUrgent ? "warning" : "info"}
          sx={{ mb: 1.5, py: 0.5, fontSize: "11.5px" }}
        >
          <AlertTitle sx={{ fontWeight: "bold", fontSize: "12px", mb: 0.2 }}>
            {cw.isUrgent
              ? `⚠️ Credit Payment Reminder: ${cw.supplierName}`
              : `ℹ️ Credit Payment Terms Active: ${cw.supplierName}`}
          </AlertTitle>
          Payment Terms: <strong>{cw.creditDays} Days Credit</strong> (from {cw.usedInvoiceDate ? "Invoice Date" : "Approval Date"}: {cw.baseDateStr}).
          {" "}Due Date: <strong>{cw.dueDateStr}</strong> ({cw.diffDays > 0 ? `${cw.diffDays} days remaining` : "Due today / overdue"}).
        </Alert>
      ))}

      {/* ─── B. Supplier Bank Details & Payment Table ─── */}
      <Box className="sop-card">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography className="sop-card-title">
            Supplier Bank & Payment Details
          </Typography>
          <button
            type="button"
            className="sop-btn sop-btn-success"
            style={{ padding: "3px 10px", fontSize: "11px" }}
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              const updated = bankSuppliers.map((sup, idx) => {
                const existing = supplierPayments[idx] || {};
                return {
                  supplierName: sup.supplierName || `Supplier ${idx + 1}`,
                  paymentTerms: sup.paymentTerms || "100% ADVANCE",
                  paymentMethod: existing.paymentMethod || "NEFT",
                  utrNumber: existing.utrNumber || `UTR${Date.now().toString().slice(-8)}`,
                  paymentDate: existing.paymentDate || today,
                  isPaid: true,
                };
              });
              onChange({
                ...data,
                supplierPayments: updated,
              });
              if (onGlobalChange) {
                onGlobalChange("status", "Payment Done");
              }
            }}
          >
            ✓ Mark All as Paid
          </button>
        </Box>

        <Box className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th style={{ minWidth: 160 }}>Items</th>
                <th>Name in Bank</th>
                <th>Bank Name</th>
                <th>Account No.</th>
                <th>IFSC</th>
                <th>Terms</th>
                <th style={{ textAlign: "right", width: 120 }}>Amount (₹)</th>
                <th style={{ width: 70, textAlign: "center" }}>Paid?</th>
                <th style={{ width: 100 }}>Method</th>
                <th style={{ width: 140 }}>UTR / Ref No.</th>
                <th style={{ width: 120 }}>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {bankSuppliers.length > 0 ? (
                bankSuppliers.map((sup, idx) => {
                  const sp = supplierPayments[idx] || {};
                  const cDays = parseCreditDays(sup.paymentTerms);
                  const isCredit = cDays > 0;
                  const termsLabel = sup.paymentTerms || (isCredit ? `${cDays}d Credit` : "ADVANCE");

                  const matchedSelected = selectedSuppliers.find(
                    (sel) => sel.selectedSupplier === sup.supplierName || sel.selectedSupplier === sup._id
                  );
                  const supplierOrderVal = matchedSelected?.totalOrderValue || sup.totalOrderValue || 0;

                  const supNameUpper = (sup.supplierName || "").toUpperCase();
                  const supItems = allReqItems.filter((it) => {
                    if (bankSuppliers.length === 1) return true;
                    const itName = (it.productName || it.tyreType || "").toUpperCase();
                    const quote = stage2Suppliers.find(
                      (s) =>
                        (s.supplierName || "").toUpperCase() === supNameUpper &&
                        (s.selectedProduct || s.selectedTyreType || "").toUpperCase() === itName
                    );
                    return Boolean(quote);
                  });
                  const itemsToDisplay = supItems.length > 0 ? supItems : allReqItems;
                  const supCancelledAmt = itemsToDisplay
                    .filter((it) => it.isCancelled)
                    .reduce((sum, it) => sum + (Number(it.estTotalCost) || (Number(it.qty || 1) * Number(it.estUnitCost || 0))), 0);
                  const effectiveSupVal = Math.max(0, supplierOrderVal - supCancelledAmt);

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: "#1d4ed8" }}>
                        {sup.supplierName || `Supplier ${idx + 1}`}
                      </td>
                      <td style={{ minWidth: 160, fontSize: "11px" }}>
                        {itemsToDisplay.map((it, itIdx) => (
                          <div key={itIdx} style={{ marginBottom: "2px", lineHeight: "1.3" }}>
                            <span style={{ textDecoration: it.isCancelled ? "line-through" : "none", color: it.isCancelled ? "#991b1b" : "#1e293b", fontWeight: 600 }}>
                              {it.productName || it.tyreType || it.description || `Item ${itIdx + 1}`} ({it.qty || 1})
                            </span>
                            {it.isCancelled && (
                              <span
                                title={`Cancelled by ${it.cancelledBy || "User"}: ${it.cancellationReason || "Cancelled"}`}
                                style={{
                                  marginLeft: "4px",
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  color: "#dc2626",
                                  backgroundColor: "#fee2e2",
                                  padding: "1px 4px",
                                  borderRadius: "3px",
                                }}
                              >
                                CANCELLED
                              </span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td>{sup.supplierNameInBank || sup.supplierName || "-"}</td>
                      <td>{sup.bankName || "-"}</td>
                      <td style={{ fontWeight: 500 }}>{sup.bankAccountNo || "-"}</td>
                      <td>{sup.bankIfscCode || "-"}</td>
                      <td>
                        <Chip
                          label={termsLabel}
                          size="small"
                          color={isCredit ? "warning" : "default"}
                          variant={isCredit ? "filled" : "outlined"}
                          sx={{ height: 18, fontSize: "10px", fontWeight: 600 }}
                        />
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#166534" }}>
                        {effectiveSupVal > 0 ? `₹${Number(effectiveSupVal).toLocaleString("en-IN")}` : "-"}
                        {supCancelledAmt > 0 && (
                          <div style={{ fontSize: "10px", color: "#dc2626", fontWeight: 500 }}>
                            (-₹{Number(supCancelledAmt).toLocaleString("en-IN")})
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(sp.isPaid && sp.utrNumber?.trim())}
                          disabled={!Boolean(sp.utrNumber?.trim())}
                          onChange={(e) => handleSupplierPaymentChange(idx, "isPaid", e.target.checked)}
                          title={!Boolean(sp.utrNumber?.trim()) ? "Enter UTR number first to mark as paid" : "Paid"}
                          style={{
                            width: 15,
                            height: 15,
                            cursor: Boolean(sp.utrNumber?.trim()) ? "pointer" : "not-allowed",
                            accentColor: "#16a34a",
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="sop-select"
                          value={sp.paymentMethod || "NEFT"}
                          onChange={(e) => handleSupplierPaymentChange(idx, "paymentMethod", e.target.value)}
                        >
                          {methodOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="sop-input"
                          placeholder="UTR No."
                          value={sp.utrNumber || ""}
                          onChange={(e) => handleSupplierPaymentChange(idx, "utrNumber", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="sop-input"
                          value={sp.paymentDate ? String(sp.paymentDate).split("T")[0] : ""}
                          onChange={(e) => handleSupplierPaymentChange(idx, "paymentDate", e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "#64748b", padding: 12 }}>
                    No bank details provided in Stage 2 Supplier Quotation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage4PaymentUtr);

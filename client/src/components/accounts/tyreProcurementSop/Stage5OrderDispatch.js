import React from "react";
import axios from "axios";
import {
  Box,
  Typography,
} from "@mui/material";

const confirmationOptions = ["WhatsApp", "Email", "Call"];

const normalizeConfirmation = (val) => {
  if (!val) return "WhatsApp";
  const s = String(val).trim().toUpperCase();
  if (s === "WHATSAPP") return "WhatsApp";
  if (s === "EMAIL") return "Email";
  if (s === "CALL") return "Call";
  return val;
};

function Stage5OrderDispatch({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({
      ...data,
      [field]: typeof value === "string" ? value.toUpperCase() : value,
    });
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
    const val = field === "modeOfConfirmation" ? normalizeConfirmation(value) : (typeof value === "string" ? value.toUpperCase() : value);

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
    const updatedSuppliers = (data.supplierDispatches || []).map((sd) => ({
      ...sd,
      dispatchDone: checked,
      isDispatchDone: checked,
    }));

    onChange({
      ...data,
      dispatchDone: checked,
      isDispatchDone: checked,
      supplierDispatches: updatedSuppliers.length > 0 ? updatedSuppliers : data.supplierDispatches,
    });

    if (onGlobalChange) {
      onGlobalChange("status", checked ? "Order Placed" : "Payment Done");
    }

    if (checked && !globalData?.stage6?.grnSeriesNo) {
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
  };

  return (
    <Box className="sop-container">
      {/* ─── A. Order & Dispatch Summary (Per Supplier) ─── */}
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Order & Dispatch Details (Per Supplier)
        </Typography>

        <Box className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: 200 }}>Parameter</th>
                {awardedSuppliers.map((supObj, idx) => {
                  const supName = supObj.supplierName || `SUPPLIER ${idx + 1}`;
                  return (
                    <th key={idx} style={{ color: "#93c5fd" }}>
                      {supName}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* PR & PO Number Reference */}
              <tr>
                <td style={{ fontWeight: 600 }}>PR & PO Reference</td>
                {awardedSuppliers.map((supObj, idx) => (
                  <td key={idx} style={{ fontWeight: 600, color: "#1e3a8a" }}>
                    PR: {globalData?.prNumber || "-"} | PO: {globalData?.poNumber || "-"}
                  </td>
                ))}
              </tr>

              {/* UTR Number */}
              <tr>
                <td style={{ fontWeight: 600 }}>UTR Number (Payment Ref)</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const spStage4 = globalData?.stage4?.supplierPayments?.[idx] || {};
                  const utrVal = sdEntry.utrNumber ?? (spStage4.utrNumber || globalData?.stage4?.paymentDetails?.paymentReferenceUtr || data.utrNumber || "");

                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={utrVal}
                        onChange={(e) => updateSupplierDispatch(idx, "utrNumber", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>

              {/* Order Placed By */}
              <tr>
                <td style={{ fontWeight: 600 }}>Order Placed By</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const placedByVal = sdEntry.orderPlacedBy ?? (globalData?.stage2?.purchaseOfficerName || data.orderPlacedBy || "");

                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={placedByVal}
                        onChange={(e) => updateSupplierDispatch(idx, "orderPlacedBy", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>

              {/* Order Placed Date */}
              <tr>
                <td style={{ fontWeight: 600 }}>Order Placed Date</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const placedDateVal = sdEntry.orderPlacedDate ?? (data.orderPlacedDate || "");

                  return (
                    <td key={idx}>
                      <input
                        type="date"
                        className="sop-input"
                        value={placedDateVal ? String(placedDateVal).split("T")[0] : ""}
                        onChange={(e) => updateSupplierDispatch(idx, "orderPlacedDate", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>

              {/* Order Confirmation Ref */}
              <tr>
                <td style={{ fontWeight: 600 }}>Order Confirmation Ref</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const confirmationVal = sdEntry.orderConfirmation ?? (data.orderConfirmation || "");

                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        placeholder="e.g. CONFIRMED ON EMAIL"
                        value={confirmationVal}
                        onChange={(e) => updateSupplierDispatch(idx, "orderConfirmation", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>

              {/* Mode of Confirmation */}
              <tr>
                <td style={{ fontWeight: 600 }}>Mode of Confirmation</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const modeVal = sdEntry.modeOfConfirmation ?? (data.modeOfConfirmation || "WhatsApp");

                  return (
                    <td key={idx}>
                      <select
                        className="sop-select"
                        value={normalizeConfirmation(modeVal)}
                        onChange={(e) => updateSupplierDispatch(idx, "modeOfConfirmation", e.target.value)}
                      >
                        {confirmationOptions.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>

              {/* Dispatch Date */}
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <td style={{ fontWeight: 700, color: "#1d4ed8" }}>Dispatch Date</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                  return (
                    <td key={idx}>
                      <input
                        type="date"
                        className="sop-input"
                        value={dispatchObj.dispatchDate ? String(dispatchObj.dispatchDate).split("T")[0] : ""}
                        onChange={(e) => updateSupplierDispatch(idx, "dispatchDate", e.target.value, "dispatchDetails")}
                      />
                    </td>
                  );
                })}
              </tr>

              {/* Vehicle Number */}
              <tr>
                <td style={{ fontWeight: 600 }}>Vehicle Number</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={dispatchObj.vehicleNumber || ""}
                        onChange={(e) => updateSupplierDispatch(idx, "vehicleNumber", e.target.value, "dispatchDetails")}
                      />
                    </td>
                  );
                })}
              </tr>

              {/* Transporter Name */}
              <tr>
                <td style={{ fontWeight: 600 }}>Transporter Name</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={dispatchObj.transporterName || ""}
                        onChange={(e) => updateSupplierDispatch(idx, "transporterName", e.target.value, "dispatchDetails")}
                      />
                    </td>
                  );
                })}
              </tr>

              {/* Driver Name & Contact */}
              <tr>
                <td style={{ fontWeight: 600 }}>Driver Name / Contact</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                  return (
                    <td key={idx}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <input
                          type="text"
                          className="sop-input"
                          placeholder="Driver Name"
                          value={dispatchObj.driverName || ""}
                          onChange={(e) => updateSupplierDispatch(idx, "driverName", e.target.value, "dispatchDetails")}
                        />
                        <input
                          type="text"
                          className="sop-input"
                          placeholder="Contact No"
                          value={dispatchObj.driverContactNo || ""}
                          onChange={(e) => updateSupplierDispatch(idx, "driverContactNo", e.target.value, "dispatchDetails")}
                        />
                      </Box>
                    </td>
                  );
                })}
              </tr>

              {/* DC Number & LR Number */}
              <tr>
                <td style={{ fontWeight: 600 }}>DC Number / LR Number</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                  return (
                    <td key={idx}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <input
                          type="text"
                          className="sop-input"
                          placeholder="DC Number"
                          value={dispatchObj.dcNumber || ""}
                          onChange={(e) => updateSupplierDispatch(idx, "dcNumber", e.target.value, "dispatchDetails")}
                        />
                        <input
                          type="text"
                          className="sop-input"
                          placeholder="LR Number"
                          value={dispatchObj.lrNumber || ""}
                          onChange={(e) => updateSupplierDispatch(idx, "lrNumber", e.target.value, "dispatchDetails")}
                        />
                      </Box>
                    </td>
                  );
                })}
              </tr>

              {/* Invoice Number & Amount */}
              <tr>
                <td style={{ fontWeight: 600 }}>Invoice Number / Amount (₹)</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};

                  return (
                    <td key={idx}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <input
                          type="text"
                          className="sop-input"
                          placeholder="Invoice No"
                          value={dispatchObj.invoiceNumber || ""}
                          onChange={(e) => updateSupplierDispatch(idx, "invoiceNumber", e.target.value, "dispatchDetails")}
                        />
                        <input
                          type="number"
                          className="sop-input"
                          placeholder="Amount"
                          value={dispatchObj.invoiceAmount || 0}
                          onChange={(e) => updateSupplierDispatch(idx, "invoiceAmount", e.target.value, "dispatchDetails")}
                        />
                      </Box>
                    </td>
                  );
                })}
              </tr>

              {/* Invoice Date */}
              <tr style={{ backgroundColor: "#eff6ff" }}>
                <td style={{ fontWeight: 700, color: "#1d4ed8" }}>Invoice Date (For Credit Terms)</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const sdEntry = supplierDispatches[idx] || {};
                  const dispatchObj = sdEntry.dispatchDetails || (idx === 0 ? data.dispatchDetails : {}) || {};
                  const invDate = dispatchObj.invoiceDate || sdEntry.invoiceDate || "";

                  return (
                    <td key={idx}>
                      <input
                        type="date"
                        className="sop-input"
                        value={invDate ? String(invDate).split("T")[0] : ""}
                        onChange={(e) => updateSupplierDispatch(idx, "invoiceDate", e.target.value, "dispatchDetails")}
                      />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>

      {/* ─── B. Remarks & Dispatch Done ─── */}
      <Box className="sop-grid-2">
        <Box className="sop-card">
          <Typography className="sop-card-title" sx={{ mb: 0.8 }}>Remarks / Tracking Notes</Typography>
          <textarea
            className="sop-textarea"
            rows={2}
            value={data.remarks || ""}
            onChange={(e) => updateField("remarks", e.target.value)}
            placeholder="Enter tracking details, transporter contact, remarks..."
          />
        </Box>

        <Box className="sop-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 700, color: "#166534", fontSize: "13px" }}>
            <input
              type="checkbox"
              checked={Boolean(data.dispatchDone)}
              onChange={(e) => handleDispatchDoneToggle(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#16a34a", cursor: "pointer" }}
            />
            Dispatch Done (Auto-generates GRN Number & Forwards to Site GRN)
          </label>
          <Typography variant="caption" sx={{ color: "#15803d", mt: 0.5, fontSize: "11px", display: "block" }}>
            * Check once materials have been confirmed dispatched by the supplier.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage5OrderDispatch);

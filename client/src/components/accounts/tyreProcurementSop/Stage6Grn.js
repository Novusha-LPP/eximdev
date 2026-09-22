import React from "react";
import {
  Box,
  Typography,
  Chip,
} from "@mui/material";

const yesNoOptions = ["Yes", "No"];
const acceptedOptions = ["Accepted", "Rejected"];
const typeOptions = ["New", "Refurbished", "Used", "Spare", "Consumable"];

const normalizeYesNo = (val) => {
  if (!val) return "";
  const s = String(val).trim().toUpperCase();
  if (s === "YES") return "Yes";
  if (s === "NO") return "No";
  return val;
};

const normalizeAccepted = (val) => {
  if (!val) return "";
  const s = String(val).trim().toUpperCase();
  if (s === "ACCEPTED") return "Accepted";
  if (s === "REJECTED") return "Rejected";
  return val;
};

const normalizeType = (val) => {
  if (!val) return "New";
  const s = String(val).trim().toUpperCase();
  if (s === "NEW") return "New";
  if (s === "REMOULD" || s === "REFURBISHED") return "Refurbished";
  if (s === "USED") return "Used";
  if (s === "SPARE") return "Spare";
  if (s === "CONSUMABLE") return "Consumable";
  return val;
};

function Stage6Grn({ data, onChange, globalData, onGlobalChange }) {
  const updateField = (field, value) => {
    onChange({ [field]: typeof value === "string" ? value.toUpperCase() : value });
  };

  const updateNested = (group, field, value) => {
    const val = group === "qualityConformanceCheck" ? normalizeYesNo(value) : (typeof value === "string" ? value.toUpperCase() : value);
    onChange({ [group]: { ...data[group], [field]: val } });
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
    let val = value;
    if (field === "type") {
      val = normalizeType(value);
    } else if (field === "acceptedRejected") {
      val = normalizeAccepted(value);
    } else if (typeof value === "string") {
      val = value.toUpperCase();
    }
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
    } else {
      current[idx] = {
        ...current[idx],
        status: "Pending",
        checked: false,
      };
    }
    onChange({ approvals: current });

    const allApproved = current.every((a) => a && (a.checked || a.status === "Done" || a.status === "DONE"));
    if (onGlobalChange) {
      if (allApproved) {
        onGlobalChange("status", "GRN Done");
      } else if (current.some((a) => a && (a.checked || a.status === "Done" || a.status === "DONE"))) {
        onGlobalChange("status", "GRN Ready");
      }
    }
  };

  return (
    <Box className="sop-container">
      {/* ─── 1. Reference & Delivery Information ─── */}
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography className="sop-card-title">Reference & Delivery Details</Typography>
        </Box>

        <Box className="sop-grid-4" sx={{ mb: 1.2 }}>
          <Box>
            <label className="sop-label">GRN SERIES NO.</label>
            <input
              type="text"
              className="sop-input"
              value={data.grnSeriesNo || ""}
              onChange={(e) => updateField("grnSeriesNo", e.target.value.toUpperCase())}
              placeholder="GRN/ITEM/01/AUG/26-27"
              style={{ fontWeight: 700, color: "#1e40af" }}
            />
          </Box>
          <Box>
            <label className="sop-label">DATE OF RECEIPT</label>
            <input
              type="date"
              className="sop-input"
              value={data.dateOfReceipt ? data.dateOfReceipt.split("T")[0] : ""}
              onChange={(e) => updateField("dateOfReceipt", e.target.value)}
            />
          </Box>
          <Box>
            <label className="sop-label">PR NUMBER</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={globalData?.prNumber || "-"}
            />
          </Box>
          <Box>
            <label className="sop-label">PO NUMBER</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={globalData?.poNumber || "-"}
            />
          </Box>
        </Box>

        {/* Per-Supplier Reference Information Table */}
        <Box className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>Supplier Parameter</th>
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
              <tr>
                <td style={{ fontWeight: 600 }}>Supplier Contact No.</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const info = referenceInfos[idx] || {};
                  const val = info.supplierContactNo ?? (supObj.phoneNumber || data.supplierContactNo || "");
                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={val}
                        onChange={(e) => updateSupplierRefInfo(idx, "supplierContactNo", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Delivery Note / DC No.</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const info = referenceInfos[idx] || {};
                  const sd = globalData?.stage5?.supplierDispatches?.[idx] || {};
                  const val = info.deliveryNoteDcNo ?? (sd.dispatchDetails?.dcNumber || globalData?.stage5?.dispatchDetails?.dcNumber || data.deliveryNoteDcNo || "");
                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={val}
                        onChange={(e) => updateSupplierRefInfo(idx, "deliveryNoteDcNo", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>LR Number</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const info = referenceInfos[idx] || {};
                  const sd = globalData?.stage5?.supplierDispatches?.[idx] || {};
                  const val = info.lrNumber ?? (sd.dispatchDetails?.lrNumber || globalData?.stage5?.dispatchDetails?.lrNumber || data.lrNumber || "");
                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={val}
                        onChange={(e) => updateSupplierRefInfo(idx, "lrNumber", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Vehicle Number</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const info = referenceInfos[idx] || {};
                  const sd = globalData?.stage5?.supplierDispatches?.[idx] || {};
                  const val = info.vehicleNumber ?? (sd.dispatchDetails?.vehicleNumber || globalData?.stage5?.dispatchDetails?.vehicleNumber || data.vehicleNumber || "");
                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={val}
                        onChange={(e) => updateSupplierRefInfo(idx, "vehicleNumber", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Delivery Location</td>
                {awardedSuppliers.map((supObj, idx) => {
                  const info = referenceInfos[idx] || {};
                  const val = info.deliveryLocation ?? (supObj.deliveryLocation || data.deliveryLocation || "");
                  return (
                    <td key={idx}>
                      <input
                        type="text"
                        className="sop-input"
                        value={val}
                        onChange={(e) => updateSupplierRefInfo(idx, "deliveryLocation", e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>

      {/* ─── 2. Items Received – Item-wise Entry ─── */}
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography className="sop-card-title">Items Received – Item-wise Entry</Typography>
          <button
            type="button"
            className="sop-btn sop-btn-primary"
            style={{ padding: "3px 10px", fontSize: "11px" }}
            onClick={addItem}
          >
            + Add Item
          </button>
        </Box>

        <Box className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: 35, textAlign: "center" }}>#</th>
                <th>Item Number (Unique ID)</th>
                <th>Brand</th>
                <th>Size & Spec</th>
                <th style={{ width: 90 }}>Type</th>
                <th style={{ width: 100 }}>Status</th>
                <th>Remarks</th>
                <th style={{ width: 45, textAlign: "center" }}>Act</th>
              </tr>
            </thead>
            <tbody>
              {itemsReceived.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="sop-input"
                      value={item.tyreNumber || ""}
                      onChange={(e) => updateItem(idx, "tyreNumber", e.target.value)}
                      placeholder="e.g. ITEM-2026-..."
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="sop-input"
                      value={item.tyreBrand || ""}
                      onChange={(e) => updateItem(idx, "tyreBrand", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="sop-input"
                      value={item.sizeSpec || ""}
                      onChange={(e) => updateItem(idx, "sizeSpec", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="sop-select"
                      value={normalizeType(item.type)}
                      onChange={(e) => updateItem(idx, "type", e.target.value)}
                    >
                      {typeOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="sop-select"
                      value={normalizeAccepted(item.acceptedRejected)}
                      onChange={(e) => updateItem(idx, "acceptedRejected", e.target.value)}
                    >
                      <option value="">Select</option>
                      {acceptedOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="sop-input"
                      value={item.remarks || ""}
                      onChange={(e) => updateItem(idx, "remarks", e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {itemsReceived.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontWeight: "bold" }}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>

      {/* ─── 3 & 4. Conformance & Notes side-by-side ─── */}
      <Box className="sop-grid-2" sx={{ mb: 1.5 }}>
        <Box className="sop-card">
          <Typography className="sop-card-title" sx={{ mb: 1 }}>Quality & Conformance Check</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
            {[
              ["1. Items verified against PR/PO specs", "tyresVerified"],
              ["2. Item numbers matched and recorded", "tyreNumbersMatched"],
              ["3. Invoice verified with PO quantity/value", "invoiceVerified"],
              ["4. Return clause reviewed for supplier action", "returnClauseReviewed"],
            ].map(([label, field]) => (
              <Box key={field} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11.5px", color: "#334155" }}>{label}</span>
                <select
                  className="sop-select"
                  style={{ width: 80 }}
                  value={normalizeYesNo(data.qualityConformanceCheck?.[field])}
                  onChange={(e) => updateNested("qualityConformanceCheck", field, e.target.value)}
                >
                  <option value="">Select</option>
                  {yesNoOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Box>
            ))}
          </Box>
        </Box>

        <Box className="sop-card">
          <Typography className="sop-card-title" sx={{ mb: 0.8 }}>Inspection Notes</Typography>
          <textarea
            className="sop-textarea"
            rows={4}
            value={data.inspectionNotes || ""}
            onChange={(e) => updateField("inspectionNotes", e.target.value)}
            placeholder="Enter physical condition, warranty marks, site verification remarks..."
          />
        </Box>
      </Box>

      {/* ─── 5. Approvals & Sign-Off ─── */}
      <Box className="sop-card">
        <Typography className="sop-card-title" sx={{ mb: 1 }}>Approvals & Sign-Off</Typography>
        <Box className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: "center" }}>Check</th>
                <th>Role / Authority</th>
                <th style={{ width: 140 }}>Date Completed</th>
                <th style={{ width: 100, textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                "Received By (Site Person)",
                "Validated by – Maintenance Manager",
                "Reviewed by – Purchase Officer",
              ].map((role, idx) => {
                const item = approvals[idx] || {};
                const isChecked = item.status === "Done" || item.checked || Boolean(item.date);

                return (
                  <tr key={idx} style={idx === 2 ? { backgroundColor: "#eff6ff" } : {}}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleApprovalToggle(idx, e.target.checked)}
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#2563eb" }}
                      />
                    </td>
                    <td style={{ fontWeight: idx === 2 ? 700 : 500, color: idx === 2 ? "#1d4ed8" : "inherit" }}>
                      {role} {idx === 2 ? "(Finalizes GRN Status)" : ""}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="sop-input"
                        value={item.date ? item.date.split("T")[0] : ""}
                        onChange={(e) => updateApproval(idx, "date", e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Chip
                        label={isChecked ? "Done" : "Pending"}
                        color={isChecked ? "success" : "default"}
                        size="small"
                        sx={{ height: 18, fontSize: "10px", fontWeight: 700 }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage6Grn);

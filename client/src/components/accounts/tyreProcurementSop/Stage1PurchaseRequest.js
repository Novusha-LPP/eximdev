import React from "react";
import axios from "axios";
import { Add, Delete } from "@mui/icons-material";
import "../../../styles/enterprise-sop.scss";

const tyreTypeOptions = ["New Tyre", "Remould Tyre"];

function Stage1PurchaseRequest({ data = {}, onChange, globalData = {}, onGlobalChange }) {
  const updateField = (field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;
    onChange({ [field]: val });
  };

  const itemsRequired = data.itemsRequired || [];
  const routingChecklist = data.routingChecklist || [];

  const updateItem = (idx, field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;
    const updated = itemsRequired.map((item, i) => (i === idx ? { ...item, [field]: val } : item));
    onChange({ itemsRequired: updated });
  };

  const addItem = () => {
    onChange({ itemsRequired: [...itemsRequired, { sNo: itemsRequired.length + 1, tyreType: "New Tyre" }] });
  };

  const removeItem = (idx) => {
    onChange({ itemsRequired: itemsRequired.filter((_, i) => i !== idx) });
  };

  const handleChecklistToggle = async (idx, checked) => {
    const today = new Date().toISOString().split("T")[0];
    const defaultSteps = [
      { step: "Step 1", action: "PR Raised by Requester", responsible: "Operations Team" },
    ];
    const current = [...routingChecklist];
    while (current.length <= idx) {
      current.push(defaultSteps[current.length] || { step: `Step ${current.length + 1}`, action: "", responsible: "" });
    }

    if (checked) {
      current[idx] = { ...current[idx], date: today, status: "Done" };
      if (idx === 0) {
        let generatedPr = globalData?.prNumber;
        let generatedPo = globalData?.poNumber;

        const isMockOrEmpty =
          !generatedPr ||
          generatedPr.startsWith("TT-TYRE-") ||
          !generatedPr.includes("/");

        if (isMockOrEmpty) {
          try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/next-numbers?date=${today}`);
            if (res.data?.success) {
              generatedPr = res.data.prNumber;
              generatedPo = res.data.poNumber;
            }
          } catch (err) {
            console.error("Error generating PR/PO numbers:", err);
            const mShort = new Date(today).toLocaleString("en-US", { month: "short" }).toUpperCase();
            generatedPr = `TT/TYRE/${mShort}/01/26-27`;
            generatedPo = `TYRE/${mShort}-01/26-27`;
          }
        }

        if (onGlobalChange) {
          if (generatedPr) onGlobalChange("prNumber", generatedPr);
          if (generatedPo) onGlobalChange("poNumber", generatedPo);
          onGlobalChange("status", "PR Raised");
        }

        onChange({
          routingChecklist: current,
          prDate: today,
        });
        return;
      }
    } else {
      current[idx] = { ...current[idx], date: "", status: "Pending" };
      if (idx === 0) {
        if (onGlobalChange) onGlobalChange("status", "Draft");
      }
    }
    onChange({ routingChecklist: current });
  };

  // Compute total
  let totalCost = 0;
  itemsRequired.forEach((item) => {
    totalCost += (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
  });

  return (
    <div className="sop-container">
      {/* Section A: Purchase Request Identity (Full Width Header Card) */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>A. Purchase Request Identity</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            >
              {globalData?.status || "Draft"}
            </span>
          </div>
        </div>

        <div className="sop-grid-4">
          <div className="sop-field-group">
            <label className="sop-field-label">PR Number</label>
            <input
              className="sop-input"
              value={globalData?.prNumber || ""}
              onChange={(e) => onGlobalChange("prNumber", e.target.value)}
              placeholder="TT/TYRE/AUG/01/26-27"
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">PO Number (Auto)</label>
            <input
              className="sop-input"
              value={globalData?.poNumber || ""}
              readOnly
              placeholder="TYRE/AUG-01/26-27"
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">PR Date</label>
            <input
              type="date"
              className="sop-input"
              value={data.prDate ? data.prDate.split("T")[0] : ""}
              onChange={(e) => updateField("prDate", e.target.value)}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">Needed By Date</label>
            <input
              type="date"
              className="sop-input"
              value={data.neededByDate ? data.neededByDate.split("T")[0] : ""}
              onChange={(e) => updateField("neededByDate", e.target.value)}
            />
          </div>
        </div>

        <div className="sop-grid-3">
          <div className="sop-field-group">
            <label className="sop-field-label">Prepared By</label>
            <input
              className="sop-input"
              value={data.preparedBy || ""}
              onChange={(e) => updateField("preparedBy", e.target.value)}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">Contact Number</label>
            <input
              className="sop-input"
              value={data.contactNumber || ""}
              onChange={(e) => updateField("contactNumber", e.target.value)}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">Department / Location</label>
            <input
              className="sop-input"
              value={data.departmentLocation || ""}
              onChange={(e) => updateField("departmentLocation", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Middle Section: Items Required Table */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>B. Items Required</span>
          <button type="button" className="sop-btn primary" onClick={addItem}>
            <Add style={{ fontSize: "14px" }} /> Add Line
          </button>
        </div>
        <div className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "130px" }}>Tyre Type</th>
                <th>Brand Preference</th>
                <th style={{ width: "110px" }}>Size / Spec</th>
                <th style={{ width: "100px" }}>Load Rating</th>
                <th style={{ width: "80px" }}>Rim Size</th>
                <th style={{ width: "70px" }}>Qty</th>
                <th style={{ width: "110px" }}>Est. Unit (₹)</th>
                <th style={{ width: "110px" }}>Est. Total (₹)</th>
                <th style={{ width: "40px", textAlign: "center" }}>Del</th>
              </tr>
            </thead>
            <tbody>
              {itemsRequired.map((item, idx) => {
                const total = (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="sop-select"
                        value={item.tyreType || "New Tyre"}
                        onChange={(e) => updateItem(idx, "tyreType", e.target.value)}
                      >
                        {tyreTypeOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.brandPreference || ""}
                        onChange={(e) => updateItem(idx, "brandPreference", e.target.value)}
                        placeholder="e.g. MRF, Apollo"
                      />
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.sizeSpec || ""}
                        onChange={(e) => updateItem(idx, "sizeSpec", e.target.value)}
                        placeholder="10.00R20"
                      />
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.loadRating || ""}
                        onChange={(e) => updateItem(idx, "loadRating", e.target.value)}
                        placeholder="146/143K"
                      />
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.rimSize || ""}
                        onChange={(e) => updateItem(idx, "rimSize", e.target.value)}
                        placeholder="20"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sop-input"
                        value={item.qty || ""}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sop-input"
                        value={item.estUnitCost || ""}
                        onChange={(e) => updateItem(idx, "estUnitCost", e.target.value)}
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#1e293b" }}>
                      {total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                      >
                        <Delete style={{ fontSize: "15px" }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compact Estimated Total Cost Strip */}
        <div className="sop-total-strip">
          <span>ESTIMATED TOTAL COST:</span>
          <span style={{ fontSize: "14px" }}>
            {totalCost.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
          </span>
        </div>
      </div>

      {/* Bottom 2-Column Row: Specification & Stock Status */}
      <div className="sop-grid-2">
        {/* Left: Specification & Supplier Preference */}
        <div className="sop-card">
          <div className="sop-card-title">C. Specification & Supplier Preference</div>
          <div className="sop-field-group">
            <label className="sop-field-label">Specification Details</label>
            <input
              className="sop-input"
              value={data.specificationDetails || ""}
              onChange={(e) => updateField("specificationDetails", e.target.value)}
              placeholder="Brand, Load Rating, Rim Size, Remould Spec, etc."
            />
          </div>
          <div className="sop-grid-2">
            <div className="sop-field-group">
              <label className="sop-field-label">Preferred Supplier (if any)</label>
              <input
                className="sop-input"
                value={data.preferredSupplier || ""}
                onChange={(e) => updateField("preferredSupplier", e.target.value)}
                placeholder="e.g. Delhi Tyre Care"
              />
            </div>
            <div className="sop-field-group">
              <label className="sop-field-label">Supplier Contact</label>
              <input
                className="sop-input"
                value={data.supplierContact || ""}
                onChange={(e) => updateField("supplierContact", e.target.value)}
                placeholder="Phone or Email"
              />
            </div>
          </div>
        </div>

        {/* Right: Current Stock Status & Comments */}
        <div className="sop-card">
          <div className="sop-card-title">D. Current Stock & Comments</div>
          <div className="sop-grid-2">
            <div className="sop-field-group">
              <label className="sop-field-label">Current Stock – New</label>
              <input
                type="number"
                className="sop-input"
                value={data.currentStockNew || 0}
                onChange={(e) => updateField("currentStockNew", e.target.value)}
              />
            </div>
            <div className="sop-field-group">
              <label className="sop-field-label">Current Stock – Used / Remould</label>
              <input
                type="number"
                className="sop-input"
                value={data.currentStockUsedRemould || 0}
                onChange={(e) => updateField("currentStockUsedRemould", e.target.value)}
              />
            </div>
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">Comments / Additional Information</label>
            <textarea
              rows={2}
              className="sop-textarea"
              value={data.comments || ""}
              onChange={(e) => updateField("comments", e.target.value)}
              placeholder="Urgent purchase request remarks..."
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Routing Checklist & Stage 1 Sign-Off */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>E. Routing Checklist & Stage 1 Sign-Off</span>
        </div>
        <div className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "45px", textAlign: "center" }}>Check</th>
                <th style={{ width: "75px" }}>Step</th>
                <th>Action</th>
                <th>Responsible</th>
                <th style={{ width: "120px" }}>Date</th>
                <th style={{ width: "80px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Step 1", "PR Raised by Requester", "Operations Team"],
              ].map(([step, action, resp], idx) => {
                const isDone = routingChecklist[idx]?.status === "Done";
                const dateVal = routingChecklist[idx]?.date ? routingChecklist[idx].date.split("T")[0] : "";
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => handleChecklistToggle(idx, e.target.checked)}
                        style={{ cursor: "pointer", width: "15px", height: "15px" }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{step}</td>
                    <td>{action}</td>
                    <td>{resp}</td>
                    <td>{dateVal || "-"}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          backgroundColor: isDone ? "#dcfce7" : "#f1f5f9",
                          color: isDone ? "#15803d" : "#64748b",
                        }}
                      >
                        {isDone ? "Done" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
          * Checking <strong>Step 1</strong> locks requester identity and auto-generates official PR / PO sequence numbers.
        </div>
      </div>
    </div>
  );
}

export default React.memo(Stage1PurchaseRequest);

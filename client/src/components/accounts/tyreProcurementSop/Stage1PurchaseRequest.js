import { COMPANY_PROFILES, COMPANY_OPTIONS, getCompanyProfile } from "./companyProfiles";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Add, Delete } from "@mui/icons-material";
import "../../../styles/enterprise-sop.scss";

function Stage1PurchaseRequest({ data = {}, onChange, globalData = {}, onGlobalChange }) {
  const [savedProducts, setSavedProducts] = useState([]);

  const fetchAutoNumbers = useCallback(async () => {
    try {
      const today = data.prDate ? data.prDate.split("T")[0] : new Date().toISOString().split("T")[0];
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/next-numbers?date=${today}`);
      if (res.data?.success) {
        if (onGlobalChange) {
          if (res.data.prNumber) onGlobalChange("prNumber", res.data.prNumber);
          if (res.data.poNumber) onGlobalChange("poNumber", res.data.poNumber);
        }
        if (!data.prDate) {
          onChange({ prDate: today });
        }
      }
    } catch (err) {
      console.error("Error auto-fetching PR/PO numbers:", err);
    }
  }, [data.prDate, onGlobalChange, onChange]);

  useEffect(() => {
    if (!globalData?.prNumber) {
      fetchAutoNumbers();
    }
  }, [globalData?.prNumber, fetchAutoNumbers]);

  useEffect(() => {
    // Fetch saved generic procurement products from backend
    axios
      .get(`${process.env.REACT_APP_API_STRING}/procurement-products`)
      .then((res) => {
        if (res.data?.products) {
          setSavedProducts(res.data.products);
        }
      })
      .catch((err) => {
        console.error("Error fetching saved procurement products:", err);
      });
  }, []);

  const updateField = (field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;
    onChange({ [field]: val });
  };

  const itemsRequired = data.itemsRequired || [];
  const routingChecklist = data.routingChecklist || [];

  const currentCompanyKey = globalData?.companyKey || data.companyKey || (globalData?.companyName ? getCompanyProfile(globalData.companyName).id : "SURAVIO");
  const compProfile = getCompanyProfile(currentCompanyKey);

  const handleCompanyChange = (e) => {
    const key = e.target.value;
    const profile = getCompanyProfile(key);

    if (onGlobalChange) {
      onGlobalChange("companyKey", profile.id);
      onGlobalChange("companyName", profile.name);
      onGlobalChange("buyerName", profile.name);
      onGlobalChange("companyAddress", `${profile.buyerAddress1} ${profile.buyerAddress2} ${profile.buyerCityState}`.trim());
      onGlobalChange("companyGstin", profile.buyerGstin);
      onGlobalChange("companyEmail", profile.buyerEmail);
      onGlobalChange("companyPhone", profile.buyerPhone);
      if (profile.defaultPoFormatStyle) {
        onGlobalChange("poFormatStyle", profile.defaultPoFormatStyle);
      }
    }

    const stageUpdates = {
      companyKey: profile.id,
      companyName: profile.name,
      departmentLocation: profile.name,
    };

    const isDefaultOrEmpty =
      !data.deliveryLocation ||
      Object.values(COMPANY_PROFILES).some((p) => p.defaultDeliveryLocation === data.deliveryLocation);

    if (isDefaultOrEmpty) {
      stageUpdates.deliveryLocation = profile.defaultDeliveryLocation;
      stageUpdates.deliveryContact = profile.defaultDeliveryContact;
      stageUpdates.deliveryContactPerson = profile.defaultDeliveryContact;
    }

    onChange(stageUpdates);
  };

  const applyCompanyDefaultLocation = () => {
    onChange({
      deliveryLocation: compProfile.defaultDeliveryLocation,
      deliveryContact: compProfile.defaultDeliveryContact,
      deliveryContactPerson: compProfile.defaultDeliveryContact,
      departmentLocation: compProfile.name,
    });
  };

  const saveProductDetails = (item) => {
    if (!item) return;
    const prodName = (item.productName || item.tyreType || "").trim().toUpperCase();
    if (!prodName) return;

    axios
      .post(`${process.env.REACT_APP_API_STRING}/procurement-products`, {
        productName: prodName,
        brandPreference: (item.brandPreference || "").trim().toUpperCase(),
        specification: (item.specification || item.sizeSpec || "").trim().toUpperCase(),
        estUnitCost: Number(item.estUnitCost) || 0,
      })
      .then((res) => {
        if (res.data?.product) {
          setSavedProducts((prev) => {
            const exists = prev.some((p) => (p.productName || "").toUpperCase() === prodName);
            if (exists) {
              return prev.map((p) =>
                (p.productName || "").toUpperCase() === prodName ? res.data.product : p
              );
            }
            return [...prev, res.data.product];
          });
        }
      })
      .catch((err) => {
        console.error("Error auto-saving procurement product:", err);
      });
  };

  const updateItem = (idx, field, value) => {
    const val = typeof value === "string" ? value.toUpperCase() : value;

    const updated = itemsRequired.map((item, i) => {
      if (i === idx) {
        const nextItem = { ...item, [field]: val };
        // Sync productName with tyreType for backward compatibility
        if (field === "productName") {
          nextItem.tyreType = val;
          // If typed/selected product matches saved product, auto-fill empty fields
          const matched = savedProducts.find(
            (p) => (p.productName || "").toUpperCase() === val.trim().toUpperCase()
          );
          if (matched) {
            if (!nextItem.brandPreference && matched.brandPreference) {
              nextItem.brandPreference = matched.brandPreference;
            }
            if (!nextItem.specification && !nextItem.sizeSpec && matched.specification) {
              nextItem.specification = matched.specification;
              nextItem.sizeSpec = matched.specification;
            }
            if (!nextItem.estUnitCost && matched.estUnitCost) {
              nextItem.estUnitCost = matched.estUnitCost;
            }
          }
        } else if (field === "tyreType") {
          nextItem.productName = val;
        } else if (field === "specification") {
          nextItem.sizeSpec = val;
        } else if (field === "sizeSpec") {
          nextItem.specification = val;
        }
        return nextItem;
      }
      return item;
    });
    onChange({ itemsRequired: updated });
  };

  const addItem = () => {
    onChange({
      itemsRequired: [
        ...itemsRequired,
        { sNo: itemsRequired.length + 1, productName: "", tyreType: "" },
      ],
    });
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
          generatedPr.startsWith("TT/TYRE/") ||
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
            generatedPr = `PR/${mShort}/01/26-27`;
            generatedPo = `PO/${mShort}-01/26-27`;
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

        {/* Company Selection & PO Layout Options */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "14px",
            marginBottom: "14px",
            padding: "12px 14px",
            backgroundColor: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
          }}
        >
          <div>
            <label className="sop-field-label" style={{ fontWeight: 800, color: "#0f3b6c", marginBottom: "4px" }}>
              🏢 Purchasing Company (Buyer)
            </label>
            <select
              className="sop-input"
              style={{ fontWeight: 700, fontSize: "12.5px", height: "36px", borderColor: "#cbd5e1" }}
              value={currentCompanyKey}
              onChange={handleCompanyChange}
            >
              {COMPANY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#64748b" }}>
              <strong>GSTIN:</strong> {compProfile.buyerGstin} | <strong>Email:</strong> {compProfile.buyerEmail}
            </div>
          </div>

          <div>
            <label className="sop-field-label" style={{ fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
              📄 PO Layout Format
            </label>
            <select
              className="sop-input"
              style={{ fontWeight: 600, fontSize: "12px", height: "36px" }}
              value={globalData?.poFormatStyle || "letterhead"}
              onChange={(e) => onGlobalChange && onGlobalChange("poFormatStyle", e.target.value)}
            >
              <option value="letterhead">📜 Official Company Letterhead (Built-in Logo)</option>
              <option value="standard">📄 Standard PO (Standalone Logo)</option>
              <option value="plain">🖨️ Plain Body (Pre-Printed Stationery)</option>
            </select>
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#64748b" }}>
              {globalData?.poFormatStyle === "letterhead"
                ? "Uses company's full letterhead graphic. Removes duplicate top logo."
                : "Standard white box with separate company logo on top-left."}
            </div>
          </div>
        </div>

        <div className="sop-grid-4">
          <div className="sop-field-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <label className="sop-field-label" style={{ marginBottom: 0 }}>PR Number</label>
              {!globalData?.prNumber && (
                <button
                  type="button"
                  onClick={fetchAutoNumbers}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    cursor: "pointer",
                  }}
                >
                  ⚡ Auto-Generate
                </button>
              )}
            </div>
            <input
              className="sop-input"
              value={globalData?.prNumber || ""}
              onChange={(e) => onGlobalChange && onGlobalChange("prNumber", e.target.value)}
              placeholder="Auto-generating..."
              style={{ fontWeight: 700, color: "#0f172a" }}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">PO Number (Auto)</label>
            <input
              className="sop-input"
              value={globalData?.poNumber || ""}
              readOnly
              placeholder="Auto-generating..."
              style={{ fontWeight: 700, color: "#047857", backgroundColor: "#f8fafc" }}
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

        {/* Delivery Location & Delivery Contact (Editable) */}
        <div className="sop-grid-2" style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
          <div className="sop-field-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="sop-field-label" style={{ fontWeight: 700, color: "#0369a1", margin: 0 }}>
                📍 Delivery Location (Editable)
              </label>
              <button
                type="button"
                onClick={applyCompanyDefaultLocation}
                style={{
                  fontSize: "9.5px",
                  fontWeight: 700,
                  color: "#0284c7",
                  background: "#e0f2fe",
                  border: "1px solid #bae6fd",
                  borderRadius: "4px",
                  padding: "1px 6px",
                  cursor: "pointer",
                }}
                title="Reset to selected company's facility address"
              >
                Auto-fill {compProfile.id} Location
              </button>
            </div>
            <input
              className="sop-input"
              value={data.deliveryLocation || data.departmentLocation || ""}
              onChange={(e) => updateField("deliveryLocation", e.target.value)}
              placeholder="e.g. Purchase Dept / Site / Warehouse"
              style={{ fontWeight: 600 }}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label" style={{ fontWeight: 700, color: "#0369a1" }}>
              📞 Delivery Contact (Person & Phone)
            </label>
            <input
              className="sop-input"
              value={
                data.deliveryContact ||
                (data.deliveryContactPerson || data.deliveryContactNumber
                  ? [data.deliveryContactPerson, data.deliveryContactNumber].filter(Boolean).join(" | ")
                  : [data.preparedBy, data.contactNumber].filter(Boolean).join(" | "))
              }
              onChange={(e) => {
                updateField("deliveryContact", e.target.value);
                updateField("deliveryContactPerson", e.target.value);
              }}
              placeholder="e.g. AJAY | 9924301166"
              style={{ fontWeight: 600 }}
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
          <datalist id="saved-procurement-products-list">
            {savedProducts.map((p, pIdx) => (
              <option key={pIdx} value={p.productName} />
            ))}
          </datalist>
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "180px" }}>Product Name / Item</th>
                <th style={{ width: "180px" }}>Brand Preference</th>
                <th>Specification</th>
                <th style={{ width: "80px" }}>Qty</th>
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
                      <input
                        className="sop-input"
                        list="saved-procurement-products-list"
                        value={item.productName || item.tyreType || ""}
                        onChange={(e) => updateItem(idx, "productName", e.target.value)}
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
                        placeholder="e.g. Paper, Ink, Tyre"
                      />
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.brandPreference || ""}
                        onChange={(e) => updateItem(idx, "brandPreference", e.target.value)}
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
                        placeholder="e.g. HP, JK Tyre, JK Paper"
                      />
                    </td>
                    <td>
                      <input
                        className="sop-input"
                        value={item.specification || item.sizeSpec || [item.loadRating, item.rimSize].filter(Boolean).join(" ") || ""}
                        onChange={(e) => updateItem(idx, "specification", e.target.value)}
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
                        placeholder="e.g. 10.00R20 146/143K 20 / 75 GSM / A4"
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
                        onBlur={() => saveProductDetails(itemsRequired[idx])}
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
              placeholder="Brand, Specification, Grade, Material / Model, etc."
            />
          </div>
          <div className="sop-grid-2">
            <div className="sop-field-group">
              <label className="sop-field-label">Preferred Supplier (if any)</label>
              <input
                className="sop-input"
                value={data.preferredSupplier || ""}
                onChange={(e) => updateField("preferredSupplier", e.target.value)}
                placeholder="e.g. Preferred Vendor"
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
              <label className="sop-field-label">Current Stock – Used / Refurbished</label>
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

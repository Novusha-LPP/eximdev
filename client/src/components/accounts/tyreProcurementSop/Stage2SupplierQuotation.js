import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Add, Delete } from "@mui/icons-material";
import "../../../styles/enterprise-sop.scss";

function Stage2SupplierQuotation({ data, onChange, globalData, onGlobalChange }) {
  const [savedSuppliers, setSavedSuppliers] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);

  useEffect(() => {
    // Fetch saved suppliers list from backend API
    axios
      .get(`${process.env.REACT_APP_API_STRING}/tyre-suppliers`)
      .then((res) => {
        if (res.data?.suppliers) {
          setSavedSuppliers(res.data.suppliers);
        }
      })
      .catch((err) => {
        console.error("Error fetching saved tyre suppliers:", err);
      });

    // Fetch saved products list from backend API
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
    onChange({ [field]: typeof value === "string" ? value.toUpperCase() : value });
  };

  const suppliers =
    data.suppliers && data.suppliers.length > 0
      ? data.suppliers
      : [{ supplierName: "SUPPLIER 1" }, { supplierName: "SUPPLIER 2" }, { supplierName: "SUPPLIER 3" }];

  const routingChecklist = data.routingChecklist || [];

  // Multiple selected/awarded suppliers
  const selectedSuppliers =
    data.selectedSuppliers && data.selectedSuppliers.length > 0
      ? data.selectedSuppliers
      : [
          {
            selectedSupplier: data.selectedSupplierL1 || "",
            priceQuoted: data.l1PriceQuoted || 0,
            totalOrderValue: data.totalOrderValue || 0,
            reasonForSelection: data.reasonForSelection || "",
          },
        ];

  const updateSupplierField = useCallback(
    (index, field, value) => {
      const current = [...suppliers];
      const val = typeof value === "string" ? value.toUpperCase() : value;
      const nextSupplier = { ...current[index], [field]: val };
      if (field === "brand" || field === "tyreBrand") {
        nextSupplier.brand = val;
        nextSupplier.tyreBrand = val;
      }
      current[index] = nextSupplier;
      onChange({ suppliers: current });
    },
    [suppliers, onChange]
  );

  const saveProductDetails = (sup) => {
    if (!sup) return;
    const prodName = (sup.selectedProduct || sup.selectedTyreType || "").trim().toUpperCase();
    if (!prodName) return;

    axios
      .post(`${process.env.REACT_APP_API_STRING}/procurement-products`, {
        productName: prodName,
        brandPreference: (sup.brand || sup.tyreBrand || "").trim().toUpperCase(),
        specification: (sup.sizeSpecification || "").trim().toUpperCase(),
        estUnitCost: Number(sup.unitPriceNew) || 0,
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
        console.error("Error auto-saving procurement product from quotation:", err);
      });
  };

  // Handle selection or typing for Supplier Name
  const handleSupplierNameSelect = (index, selectedVal) => {
    const rawName = typeof selectedVal === "string" ? selectedVal : (selectedVal?.supplierName || "");
    const nameUpper = rawName.toUpperCase();

    const matched = savedSuppliers.find(
      (s) => s.supplierName?.toUpperCase() === nameUpper
    );

    const current = [...suppliers];
    const existing = current[index] || {};

    if (matched) {
      current[index] = {
        ...existing,
        supplierName: nameUpper,
        contactPerson: matched.contactPerson?.toUpperCase() || existing.contactPerson || "",
        phoneNumber: matched.phoneNumber?.toUpperCase() || existing.phoneNumber || "",
        emailWhatsApp: matched.emailWhatsApp?.toUpperCase() || existing.emailWhatsApp || "",
        gstNumber: matched.gstNumber?.toUpperCase() || existing.gstNumber || "",
        bankAccountNo: matched.bankAccountNo?.toUpperCase() || existing.bankAccountNo || "",
        bankName: matched.bankName?.toUpperCase() || existing.bankName || "",
        bankIfscCode: matched.bankIfscCode?.toUpperCase() || existing.bankIfscCode || "",
        bankBranchCode: matched.bankBranchCode?.toUpperCase() || existing.bankBranchCode || "",
        supplierNameInBank: matched.supplierNameInBank?.toUpperCase() || existing.supplierNameInBank || "",
        paymentTerms: matched.paymentTerms?.toUpperCase() || existing.paymentTerms || "",
        deliveryLocation: matched.deliveryLocation?.toUpperCase() || existing.deliveryLocation || "",
      };
    } else {
      current[index] = {
        ...existing,
        supplierName: nameUpper,
      };
    }
    onChange({ suppliers: current });
  };

  const addSupplier = () => {
    const nextIdx = suppliers.length + 1;
    const newSupplier = { supplierName: `SUPPLIER ${nextIdx}` };
    onChange({ suppliers: [...suppliers, newSupplier] });
  };

  const removeSupplier = (idx) => {
    if (suppliers.length <= 1) {
      alert("At least one supplier is required");
      return;
    }
    const updated = suppliers.filter((_, i) => i !== idx);
    onChange({ suppliers: updated });
  };

  // Get available Products from Stage 1 items + Saved Procurement Products
  const stage1Items = globalData?.stage1?.itemsRequired || [];
  const stage1ProductNames = stage1Items
    .map((item) => (item.productName || item.tyreType || "").trim().toUpperCase())
    .filter(Boolean);
  const masterProductNames = savedProducts
    .map((p) => (p.productName || "").trim().toUpperCase())
    .filter(Boolean);

  const availableProducts = Array.from(
    new Set([...stage1ProductNames, ...masterProductNames])
  );

  // Auto-fill suppliers from Stage 1 items when suppliers are blank
  useEffect(() => {
    if (stage1Items.length > 0 && suppliers.some((s) => !s.selectedProduct && !s.selectedTyreType)) {
      const firstItem = stage1Items[0];
      const prodName = (firstItem.productName || firstItem.tyreType || "").trim().toUpperCase();
      if (prodName) {
        const brand = (firstItem.brandPreference || "").toUpperCase();
        const spec = (firstItem.specification || firstItem.sizeSpec || [firstItem.loadRating, firstItem.rimSize].filter(Boolean).join(" ") || "").toUpperCase();
        const qty = firstItem.qty || 0;
        const price = firstItem.estUnitCost || 0;

        const updated = suppliers.map((sup) => {
          if (!sup.selectedProduct && !sup.selectedTyreType) {
            return {
              ...sup,
              selectedProduct: prodName,
              selectedTyreType: prodName,
              brand: brand || sup.brand || sup.tyreBrand || "",
              tyreBrand: brand || sup.tyreBrand || sup.brand || "",
              sizeSpecification: spec || sup.sizeSpecification || "",
              qtyAvailable: qty || sup.qtyAvailable || 0,
              unitPriceNew: price || sup.unitPriceNew || 0,
            };
          }
          return sup;
        });
        onChange({ suppliers: updated });
      }
    }
  }, [stage1Items.length]);

  // Handle Product selection/typing for a supplier -> Auto-fetch item details from Stage 1 if available and auto-save product
  const handleProductSelect = (idx, selectedProduct) => {
    const rawVal = typeof selectedProduct === "string" ? selectedProduct : (selectedProduct?.productName || "");
    const prodUpper = rawVal.toUpperCase();

    const matchedItem = stage1Items.find(
      (item) => (item.productName || item.tyreType || "").trim().toUpperCase() === prodUpper
    );
    const matchedSaved = savedProducts.find(
      (p) => (p.productName || "").toUpperCase() === prodUpper
    );

    const resolvedBrand = (
      matchedItem?.brandPreference ||
      matchedSaved?.brandPreference ||
      suppliers[idx]?.brand ||
      suppliers[idx]?.tyreBrand ||
      ""
    ).toUpperCase();

    const resolvedSpec = (
      matchedItem?.specification ||
      matchedItem?.sizeSpec ||
      [matchedItem?.loadRating, matchedItem?.rimSize].filter(Boolean).join(" ") ||
      matchedSaved?.specification ||
      suppliers[idx]?.sizeSpecification ||
      ""
    ).toUpperCase();

    const resolvedQty = matchedItem?.qty || suppliers[idx]?.qtyAvailable || 0;
    const resolvedPrice = matchedItem?.estUnitCost || matchedSaved?.estUnitCost || suppliers[idx]?.unitPriceNew || 0;

    const current = [...suppliers];
    const existing = current[idx] || {};

    const updatedSup = {
      ...existing,
      selectedProduct: prodUpper,
      selectedTyreType: prodUpper,
      brand: resolvedBrand,
      tyreBrand: resolvedBrand,
      sizeSpecification: resolvedSpec,
      qtyAvailable: resolvedQty,
      unitPriceNew: resolvedPrice,
    };

    current[idx] = updatedSup;
    onChange({ suppliers: current });

    // Immediately save new product details to backend and local state if not empty
    if (prodUpper.trim()) {
      saveProductDetails(updatedSup);
    }
  };

  // Helper to ensure each distinct supplier in selectedSuppliers gets a valid sequential PO number
  const ensureSupplierPoNumbers = async (suppliersList) => {
    const validSuppliers = suppliersList.filter((s) => s.selectedSupplier && s.selectedSupplier.trim());
    if (validSuppliers.length === 0) return suppliersList;

    const suppliersPayload = validSuppliers.map((s) => ({
      selectedSupplier: s.selectedSupplier.trim(),
    }));

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/tyre-procurement/next-po-numbers`,
        {
          suppliers: suppliersPayload,
          date: data?.poDate || globalData?.createdAt || new Date().toISOString(),
          currentId: globalData?._id || undefined,
        }
      );

      if (res.data?.success && res.data?.supplierToPo) {
        const supplierToPo = res.data.supplierToPo;
        const updatedWithPo = suppliersList.map((s) => {
          const sName = (s.selectedSupplier || "").trim().toUpperCase();
          const assignedPo = supplierToPo[sName] || s.poNumber || globalData?.poNumber || "";
          return { ...s, poNumber: assignedPo };
        });

        // Also sync the first supplier's PO to globalData.poNumber if empty or legacy
        if (updatedWithPo[0]?.poNumber && onGlobalChange) {
          onGlobalChange("poNumber", updatedWithPo[0].poNumber);
        }

        return updatedWithPo;
      }
    } catch (err) {
      console.error("Error auto-fetching supplier PO numbers:", err);
    }
    return suppliersList;
  };

  // Update a selected supplier entry in Section C
  const updateSelectedSupplier = async (idx, field, value) => {
    let current = [...selectedSuppliers];
    const val = typeof value === "string" ? value.toUpperCase() : value;
    current[idx] = { ...current[idx], [field]: val };

    if (field === "selectedSupplier") {
      const selectedName = val;
      const foundIdx = suppliers.findIndex(
        (s, i) =>
          (s.supplierName || `SUPPLIER ${i + 1}`).toUpperCase() === selectedName ||
          `SUPPLIER ${i + 1}` === selectedName
      );
      if (foundIdx !== -1) {
        const s = suppliers[foundIdx];
        const newPrice = Number(s?.unitPriceNew) || 0;
        const remouldPrice = Number(s?.unitPriceRemould) || 0;
        const price = newPrice > 0 ? newPrice : remouldPrice;
        const qty = Number(s?.qtyAvailable) || 0;
        const freight = Number(s?.freightCharges) || 0;
        const discount = Number(s?.discountOffered) || 0;
        const total = price * qty + freight - discount;
        current[idx].priceQuoted = price;
        current[idx].totalOrderValue = total;
      }

      // Automatically generate/assign continuous sequential PO numbers per unique supplier
      current = await ensureSupplierPoNumbers(current);
    }

    const overallTotal = current.reduce((acc, item) => acc + (Number(item.totalOrderValue) || 0), 0);
    onChange({
      selectedSuppliers: current,
      selectedSupplierL1: current[0]?.selectedSupplier || "",
      l1PriceQuoted: current[0]?.priceQuoted || 0,
      totalOrderValue: overallTotal,
      reasonForSelection: current[0]?.reasonForSelection || "",
    });
  };

  const addSelectedSupplier = () => {
    const updated = [
      ...selectedSuppliers,
      { selectedSupplier: "", priceQuoted: 0, totalOrderValue: 0, reasonForSelection: "", poNumber: "" },
    ];
    onChange({ selectedSuppliers: updated });
  };

  const removeSelectedSupplier = (idx) => {
    if (selectedSuppliers.length <= 1) return;
    const updated = selectedSuppliers.filter((_, i) => i !== idx);
    const overallTotal = updated.reduce((acc, item) => acc + (Number(item.totalOrderValue) || 0), 0);
    onChange({
      selectedSuppliers: updated,
      selectedSupplierL1: updated[0]?.selectedSupplier || "",
      l1PriceQuoted: updated[0]?.priceQuoted || 0,
      totalOrderValue: overallTotal,
      reasonForSelection: updated[0]?.reasonForSelection || "",
    });
  };

  const handleChecklistToggle = (idx, checked) => {
    const today = new Date().toISOString().split("T")[0];
    const defaultSteps = [
      { step: "Step 1", action: "Sent to Finance Manager for approval", responsible: "Purchase Officer" },
    ];
    const current = [...routingChecklist];
    while (current.length <= idx) {
      current.push(defaultSteps[current.length] || { step: `Step ${current.length + 1}`, action: "", responsible: "" });
    }

    if (checked) {
      current[idx] = { ...current[idx], date: today, status: "Done" };
      if (onGlobalChange) onGlobalChange("status", "Quotation Received");
    } else {
      current[idx] = { ...current[idx], date: "", status: "Pending" };
      if (onGlobalChange) onGlobalChange("status", "Preparing for Quotation");
    }
    onChange({ routingChecklist: current });
  };

  return (
    <div className="sop-container">
      {/* Section A: Reference Details */}
      <div className="sop-card">
        <div className="sop-card-title">A. Reference Details</div>
        <div className="sop-grid-4">
          <div className="sop-field-group">
            <label className="sop-field-label">PR Number</label>
            <input
              className="sop-input"
              value={globalData?.prNumber || ""}
              readOnly
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">PO Number</label>
            {(() => {
              const allPos = Array.from(
                new Set(
                  (selectedSuppliers || [])
                    .map((s) => s.poNumber)
                    .filter(Boolean)
                )
              );
              const poDisplay = allPos.length > 0 ? allPos.join(", ") : (globalData?.poNumber || "");
              return (
                <input
                  className="sop-input"
                  value={poDisplay}
                  onChange={(e) => onGlobalChange("poNumber", e.target.value.toUpperCase())}
                  placeholder="PO/SEP-01/26-27"
                  style={{ fontWeight: 600, color: "#1d4ed8" }}
                />
              );
            })()}
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">Purchase Officer Name</label>
            <input
              className="sop-input"
              value={data.purchaseOfficerName || ""}
              onChange={(e) => updateField("purchaseOfficerName", e.target.value.toUpperCase())}
            />
          </div>
          <div className="sop-field-group">
            <label className="sop-field-label">PO Date</label>
            <input
              type="date"
              className="sop-input"
              value={data.poDate ? data.poDate.split("T")[0] : ""}
              onChange={(e) => updateField("poDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section B: Supplier Details & Quotation Comparative Table */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>B. Supplier Details & Comparative Quotation</span>
          <button type="button" className="sop-btn primary" onClick={addSupplier}>
            <Add style={{ fontSize: "14px" }} /> Add Supplier
          </button>
        </div>
        <div className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "200px" }}>Field</th>
                {suppliers.map((sup, idx) => (
                  <th key={idx}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>{(sup.supplierName || `SUPPLIER ${idx + 1}`).toUpperCase()}</span>
                      {suppliers.length > 3 && (
                        <button
                          type="button"
                          onClick={() => removeSupplier(idx)}
                          style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer" }}
                        >
                          <Delete style={{ fontSize: "14px" }} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Product / Item Selection with Autocomplete */}
              <datalist id="saved-products-quotation-list">
                {availableProducts.map((p, pIdx) => (
                  <option key={pIdx} value={p} />
                ))}
              </datalist>
              <tr style={{ backgroundColor: "#f0f7ff" }}>
                <td style={{ fontWeight: 700, color: "#1d4ed8" }}>Select / Type Product</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      list="saved-products-quotation-list"
                      value={sup?.selectedProduct || sup?.selectedTyreType || ""}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      placeholder="Type or select product (e.g. Paper, Ink)"
                      style={{ fontWeight: 600, color: "#1d4ed8" }}
                    />
                  </td>
                ))}
              </tr>

              {/* Supplier Name */}
              <datalist id="saved-tyre-suppliers-list">
                {savedSuppliers.map((s, sIdx) => (
                  <option key={sIdx} value={(s.supplierName || "").toUpperCase()} />
                ))}
              </datalist>
              <tr>
                <td style={{ fontWeight: 600 }}>Supplier Name</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      list="saved-tyre-suppliers-list"
                      value={sup.supplierName || ""}
                      onChange={(e) => handleSupplierNameSelect(idx, e.target.value)}
                      placeholder="Type or select supplier"
                    />
                  </td>
                ))}
              </tr>

              {/* Contact Person */}
              <tr>
                <td style={{ fontWeight: 600 }}>Contact Person</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.contactPerson || ""}
                      onChange={(e) => updateSupplierField(idx, "contactPerson", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Phone / Mobile */}
              <tr>
                <td style={{ fontWeight: 600 }}>Phone / Mobile</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.phoneNumber || ""}
                      onChange={(e) => updateSupplierField(idx, "phoneNumber", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Email / WhatsApp */}
              <tr>
                <td style={{ fontWeight: 600 }}>Email / WhatsApp</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.emailWhatsApp || ""}
                      onChange={(e) => updateSupplierField(idx, "emailWhatsApp", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* GST Number */}
              <tr>
                <td style={{ fontWeight: 600 }}>GST Number</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.gstNumber || ""}
                      onChange={(e) => updateSupplierField(idx, "gstNumber", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Bank Account No. */}
              <tr>
                <td style={{ fontWeight: 600 }}>Bank Account No.</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.bankAccountNo || ""}
                      onChange={(e) => updateSupplierField(idx, "bankAccountNo", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Bank Name */}
              <tr>
                <td style={{ fontWeight: 600 }}>Bank Name</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.bankName || ""}
                      onChange={(e) => updateSupplierField(idx, "bankName", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Bank IFSC Code */}
              <tr>
                <td style={{ fontWeight: 600 }}>Bank IFSC Code</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.bankIfscCode || ""}
                      onChange={(e) => updateSupplierField(idx, "bankIfscCode", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Bank Branch Code */}
              <tr>
                <td style={{ fontWeight: 600 }}>Bank Branch Code</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.bankBranchCode || ""}
                      onChange={(e) => updateSupplierField(idx, "bankBranchCode", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Supplier Name in Bank */}
              <tr>
                <td style={{ fontWeight: 600 }}>Supplier Name in Bank</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.supplierNameInBank || ""}
                      onChange={(e) => updateSupplierField(idx, "supplierNameInBank", e.target.value)}
                    />
                  </td>
                ))}
              </tr>

              {/* Quote Parameters Rows */}
              {[
                ["Brand", "tyreBrand", "text"],
                ["Specification", "sizeSpecification", "text"],
                ["Unit Price (₹)", "unitPriceNew", "number"],
                ["Unit Price – Secondary / Remould (₹)", "unitPriceRemould", "number"],
                ["Qty Available", "qtyAvailable", "number"],
                ["Freight Charges", "freightCharges", "number"],
                ["Delivery Timeline", "deliveryTimeline", "text"],
                ["Delivery Location", "deliveryLocation", "text"],
                ["Warranty / Guarantee", "warrantyGuarantee", "text"],
                ["Payment Terms : Adv / Days", "paymentTerms", "text"],
                ["Discount Offered", "discountOffered", "number"],
                ["Remarks", "remarks", "text"],
              ].map(([label, field, type]) => (
                <tr key={field}>
                  <td style={{ fontWeight: 600 }}>{label}</td>
                  {suppliers.map((sup, idx) => (
                    <td key={idx}>
                      <input
                        type={type}
                        className="sop-input"
                        value={sup?.[field] ?? ""}
                        onChange={(e) => updateSupplierField(idx, field, type === "text" ? e.target.value.toUpperCase() : e.target.value)}
                        onBlur={() => saveProductDetails(suppliers[idx])}
                        style={type === "number" ? { textAlign: "right" } : {}}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section C: Selected / Awarded Supplier(s) Selection */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>C. Selected / Awarded Supplier(s) Selection</span>
          <button type="button" className="sop-btn primary" onClick={addSelectedSupplier}>
            <Add style={{ fontSize: "14px" }} /> Add Awarded Supplier
          </button>
        </div>

        {selectedSuppliers.map((item, idx) => (
          <div key={idx} style={{ background: "#f8fafc", padding: "10px", borderRadius: "4px", border: "1px solid #e2e8f0", marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 700, fontSize: "12px", color: "#1d4ed8" }}>
                Awarded Supplier #{idx + 1}
              </span>
              {selectedSuppliers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSelectedSupplier(idx)}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                >
                  <Delete style={{ fontSize: "14px" }} />
                </button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              <div className="sop-field-group">
                <label className="sop-field-label">Selected Supplier</label>
                <select
                  className="sop-select"
                  value={(item.selectedSupplier || "").toUpperCase()}
                  onChange={(e) => updateSelectedSupplier(idx, "selectedSupplier", e.target.value)}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s, i) => {
                    const rawName = s.supplierName || `SUPPLIER ${i + 1}`;
                    const sName = rawName.toUpperCase();
                    return (
                      <option key={i} value={sName}>
                        {sName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="sop-field-group">
                <label className="sop-field-label">PO Number</label>
                <input
                  className="sop-input"
                  value={item.poNumber || globalData?.poNumber || ""}
                  onChange={(e) => updateSelectedSupplier(idx, "poNumber", e.target.value.toUpperCase())}
                  placeholder="PO/SEP-01/26-27"
                  style={{ fontWeight: 600, color: "#1d4ed8" }}
                />
              </div>
              <div className="sop-field-group">
                <label className="sop-field-label">Price Quoted (₹)</label>
                <input
                  type="number"
                  className="sop-input"
                  value={item.priceQuoted ?? 0}
                  onChange={(e) => updateSelectedSupplier(idx, "priceQuoted", e.target.value)}
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="sop-field-group">
                <label className="sop-field-label">Total Order Value (₹)</label>
                <input
                  type="number"
                  className="sop-input"
                  value={item.totalOrderValue ?? 0}
                  onChange={(e) => updateSelectedSupplier(idx, "totalOrderValue", e.target.value)}
                  style={{ textAlign: "right", fontWeight: 700 }}
                />
              </div>
              <div className="sop-field-group">
                <label className="sop-field-label">Reason for Selection</label>
                <input
                  className="sop-input"
                  value={item.reasonForSelection || ""}
                  onChange={(e) => updateSelectedSupplier(idx, "reasonForSelection", e.target.value.toUpperCase())}
                  placeholder="e.g. LOWER PRICE"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section D: Routing & Checklist */}
      <div className="sop-card">
        <div className="sop-card-title">D. Routing & Checklist</div>
        <div className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>Check</th>
                <th style={{ width: "65px" }}>Step</th>
                <th>Action</th>
                <th>Responsible</th>
                <th style={{ width: "100px" }}>Date</th>
                <th style={{ width: "65px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[{ step: "Step 1", action: "Sent to Finance Manager for approval", responsible: "Purchase Officer" }].map(
                (step, idx) => {
                  const item = routingChecklist[idx] || {};
                  const isChecked = item.status === "Done";

                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleChecklistToggle(idx, e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>{step.step}</td>
                      <td>{step.action}</td>
                      <td>{step.responsible}</td>
                      <td>{item.date || "-"}</td>
                      <td>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "8px",
                            backgroundColor: isChecked ? "#dcfce7" : "#f1f5f9",
                            color: isChecked ? "#15803d" : "#64748b",
                          }}
                        >
                          {isChecked ? "Done" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Stage2SupplierQuotation);

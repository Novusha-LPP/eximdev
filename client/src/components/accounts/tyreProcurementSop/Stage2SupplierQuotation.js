import { getCompanyProfile } from "./companyProfiles";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ApproverPairSelector from "./ApproverPairSelector";
import { Add, Delete, OpenInNew } from "@mui/icons-material";
import "../../../styles/enterprise-sop.scss";

function Stage2SupplierQuotation({ data, onChange, globalData, onGlobalChange }) {
  const [savedSuppliers, setSavedSuppliers] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);
  const compProfile = getCompanyProfile(globalData?.companyKey || globalData?.companyName);

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

const DEFAULT_TERMS = [
  "Payment Terms: As per agreed purchase order schedule.",
  "Delivery Timeline: Strictly as specified in the purchase order schedule.",
  "Quality & Specifications: Goods supplied must conform strictly to approved technical specifications.",
  "Warranty & Guarantee: Standard manufacturer/supplier warranty applies to all delivered goods.",
  "Inspection & Delivery: Acceptance is subject to site physical verification. Original Tax Invoice & delivery documents must accompany shipment.",
];

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
      if (field === "address" || field === "supplierAddress") {
        nextSupplier.address = val;
        nextSupplier.supplierAddress = val;
      }
      if (field === "unitPriceNew" || field === "qtyAvailable" || field === "gstRate") {
        const price = Number(field === "unitPriceNew" ? val : nextSupplier.unitPriceNew) || 0;
        const qty = Number(field === "qtyAvailable" ? val : nextSupplier.qtyAvailable) || 0;
        const gstRateVal = parseFloat(String(field === "gstRate" ? val : (nextSupplier.gstRate || "0")).replace("%", "")) || 0;
        if (gstRateVal > 0) {
          nextSupplier.gstAmount = Math.round((price * qty * gstRateVal) / 100);
        }
      }
      current[index] = nextSupplier;

      const updates = { suppliers: current };
      // Auto-fill and synchronize Section C if it's the primary awarded supplier or not yet picked
      const isFirstRowEmpty = !selectedSuppliers[0]?.selectedSupplier;
      const isTargetQuote = selectedSuppliers[0]?.quoteIndex === index || (selectedSuppliers[0]?.quoteIndex === undefined && index === 0);
      if (
        selectedSuppliers.length <= 1 &&
        (isFirstRowEmpty || (isTargetQuote && !selectedSuppliers[0]?.isConsolidatedVendor))
      ) {
        const stage1TotalQty = (globalData?.stage1?.itemsRequired || []).reduce(
          (sum, it) => sum + (Number(it.qty) || 0),
          0
        );
        const price = Number(nextSupplier.unitPriceNew) || Number(nextSupplier.priceQuoted) || 0;
        const qty = Number(nextSupplier.qtyAvailable) || (stage1TotalQty > 0 ? stage1TotalQty : 1);
        const freight = Number(nextSupplier.freightCharges) || 0;
        const discount = Number(nextSupplier.discountOffered) || 0;
        const gstRateVal = parseFloat(String(nextSupplier.gstRate || 0).replace("%", "")) || 0;
        const gstAmt = nextSupplier.gstAmount !== undefined && nextSupplier.gstAmount !== null && nextSupplier.gstAmount !== ""
          ? Number(nextSupplier.gstAmount)
          : Math.round((price * qty * gstRateVal) / 100);
        const total = price * qty + gstAmt + freight - discount;

        updates.selectedSuppliers = [
          {
            ...(selectedSuppliers[0] || {}),
            selectedSupplier: (nextSupplier.supplierName || `SUPPLIER ${index + 1}`).toUpperCase(),
            priceQuoted: price,
            allocatedQty: qty,
            qty: qty,
            totalOrderValue: total > 0 ? total : (price * qty),
            contactPerson: nextSupplier.contactPerson || selectedSuppliers[0]?.contactPerson || "",
            supplierAddress: nextSupplier.supplierAddress || nextSupplier.address || selectedSuppliers[0]?.supplierAddress || "",
            address: nextSupplier.address || nextSupplier.supplierAddress || selectedSuppliers[0]?.address || "",
            phoneNumber: nextSupplier.phoneNumber || selectedSuppliers[0]?.phoneNumber || "",
            emailWhatsApp: nextSupplier.emailWhatsApp || selectedSuppliers[0]?.emailWhatsApp || "",
            gstNumber: nextSupplier.gstNumber || selectedSuppliers[0]?.gstNumber || "",
            bankName: nextSupplier.bankName || selectedSuppliers[0]?.bankName || "",
            bankAccountNo: nextSupplier.bankAccountNo || selectedSuppliers[0]?.bankAccountNo || "",
            bankIfscCode: nextSupplier.bankIfscCode || selectedSuppliers[0]?.bankIfscCode || "",
            paymentTerms: nextSupplier.paymentTerms || selectedSuppliers[0]?.paymentTerms || "",
            gstRate: nextSupplier.gstRate || selectedSuppliers[0]?.gstRate || "",
            gstAmount: gstAmt,
            reasonForSelection: selectedSuppliers[0]?.reasonForSelection || "L1 - LOWEST QUOTE",
            hsnCode: nextSupplier.hsnCode || selectedSuppliers[0]?.hsnCode || globalData?.stage1?.itemsRequired?.[0]?.hsnCode || "",
            poNumber: selectedSuppliers[0]?.poNumber || globalData?.poNumber || "",
            deliveryLocation: nextSupplier.deliveryLocation || selectedSuppliers[0]?.deliveryLocation || compProfile?.defaultDeliveryLocation || "",
            deliveryContact: nextSupplier.deliveryContact || selectedSuppliers[0]?.deliveryContact || compProfile?.defaultDeliveryContact || "",
          },
        ];
        updates.selectedSupplierL1 = (nextSupplier.supplierName || `SUPPLIER ${index + 1}`).toUpperCase();
        updates.l1PriceQuoted = price;
        updates.totalOrderValue = total > 0 ? total : (price * qty);
      }

      onChange(updates);
    },
    [suppliers, selectedSuppliers, globalData, onChange]
  );

  const saveSupplierDetails = (sup) => {
    if (!sup || !sup.supplierName || !sup.supplierName.trim()) return;
    const name = sup.supplierName.trim().toUpperCase();
    if (name.startsWith("SUPPLIER ")) return; // Don't auto-save generic placeholder names

    axios
      .post(`${process.env.REACT_APP_API_STRING}/tyre-suppliers`, {
        supplierName: name,
        contactPerson: (sup.contactPerson || "").trim().toUpperCase(),
        address: (sup.supplierAddress || sup.address || "").trim().toUpperCase(),
        supplierAddress: (sup.supplierAddress || sup.address || "").trim().toUpperCase(),
        phoneNumber: (sup.phoneNumber || "").trim().toUpperCase(),
        emailWhatsApp: (sup.emailWhatsApp || "").trim().toUpperCase(),
        gstNumber: (sup.gstNumber || "").trim().toUpperCase(),
        bankAccountNo: (sup.bankAccountNo || "").trim().toUpperCase(),
        bankName: (sup.bankName || "").trim().toUpperCase(),
        bankIfscCode: (sup.bankIfscCode || "").trim().toUpperCase(),
        bankBranchCode: (sup.bankBranchCode || "").trim().toUpperCase(),
        supplierNameInBank: (sup.supplierNameInBank || "").trim().toUpperCase(),
        paymentTerms: (sup.paymentTerms || "").trim().toUpperCase(),
      })
      .then((res) => {
        if (res.data?.supplier) {
          setSavedSuppliers((prev) => {
            const exists = prev.some((s) => (s.supplierName || "").toUpperCase() === name);
            if (exists) {
              return prev.map((s) => ((s.supplierName || "").toUpperCase() === name ? res.data.supplier : s));
            }
            return [...prev, res.data.supplier];
          });
        }
      })
      .catch((err) => {
        console.error("Error auto-saving tyre supplier:", err);
      });
  };

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
        supplierAddress: matched.supplierAddress?.toUpperCase() || matched.address?.toUpperCase() || existing.supplierAddress || existing.address || "",
        address: matched.address?.toUpperCase() || matched.supplierAddress?.toUpperCase() || existing.address || existing.supplierAddress || "",
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
      alert("At least one quotation is required");
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

    // Check if any supplier actually needs a PO number
    const suppliersNeedingPo = validSuppliers.filter((s) => !s.poNumber || !s.poNumber.trim());
    if (suppliersNeedingPo.length === 0) return suppliersList;

    const suppliersPayload = suppliersNeedingPo.map((s) => ({
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
          const assignedPo = s.poNumber || supplierToPo[sName] || globalData?.poNumber || "";
          return { ...s, poNumber: assignedPo };
        });

        // Also sync the first supplier's PO to globalData.poNumber if empty or legacy
        if (updatedWithPo[0]?.poNumber && onGlobalChange && !globalData?.poNumber) {
          onGlobalChange("poNumber", updatedWithPo[0].poNumber);
        }

        return updatedWithPo;
      }
    } catch (err) {
      console.error("Error auto-fetching supplier PO numbers:", err);
    }
    return suppliersList;
  };

  // Helper to award all items from a multi-item vendor in 1 consolidated PO
  const handleAwardAllFromVendor = async (vendorName) => {
    const vNameUpper = (vendorName || "").trim().toUpperCase();
    await updateSelectedSupplier(0, "selectedSupplier", `ALL__${vNameUpper}`);
    if (selectedSuppliers.length > 1) {
      const consolidated = selectedSuppliers[0];
      onChange({
        selectedSuppliers: [consolidated],
        selectedSupplierL1: consolidated.selectedSupplier,
        l1PriceQuoted: consolidated.priceQuoted,
        totalOrderValue: consolidated.totalOrderValue,
      });
    }
  };

  // Helper to auto-populate separate rows for each item from a multi-item vendor
  const handlePopulateAllItemRows = async (vendorName) => {
    const vNameUpper = (vendorName || "").trim().toUpperCase();
    const matchingQuotes = suppliers
      .map((s, idx) => ({ ...s, quoteIndex: idx }))
      .filter((s) => (s.supplierName || "").trim().toUpperCase() === vNameUpper);

    if (matchingQuotes.length === 0) return;

    let newRows = [];
    for (let i = 0; i < matchingQuotes.length; i++) {
      const q = matchingQuotes[i];
      const p = Number(q.unitPriceNew) || Number(q.priceQuoted) || 0;
      const qQty = Number(q.qtyAvailable) || 1;
      const gstRateVal = parseFloat(String(q.gstRate || 0).replace("%", "")) || 0;
      const gstAmt = q.gstAmount !== undefined && q.gstAmount !== null && q.gstAmount !== ""
        ? Number(q.gstAmount)
        : Math.round((p * qQty * gstRateVal) / 100);
      const fr = Number(q.freightCharges) || 0;
      const disc = Number(q.discountOffered) || 0;
      const total = p * qQty + gstAmt + fr - disc;
      const pName = q.selectedProduct || q.selectedTyreType || q.description || `Item ${q.quoteIndex + 1}`;

      newRows.push({
        selectedSupplier: vNameUpper,
        selectedProduct: pName,
        quoteIndex: q.quoteIndex,
        isConsolidatedVendor: false,
        priceQuoted: p,
        allocatedQty: qQty,
        qty: qQty,
        totalOrderValue: total > 0 ? total : (p * qQty),
        reasonForSelection: "L1 - LOWEST QUOTE",
        contactPerson: q.contactPerson || "",
        supplierAddress: q.supplierAddress || q.address || "",
        address: q.address || q.supplierAddress || "",
        phoneNumber: q.phoneNumber || "",
        emailWhatsApp: q.emailWhatsApp || "",
        gstNumber: q.gstNumber || "",
        bankName: q.bankName || "",
        bankAccountNo: q.bankAccountNo || "",
        bankIfscCode: q.bankIfscCode || "",
        paymentTerms: q.paymentTerms || "",
        gstRate: q.gstRate || "",
        gstAmount: gstAmt,
        deliveryLocation: q.deliveryLocation || compProfile?.defaultDeliveryLocation || "",
        deliveryContact: q.deliveryContact || compProfile?.defaultDeliveryContact || "",
        hsnCode: q.hsnCode || globalData?.stage1?.itemsRequired?.[q.quoteIndex]?.hsnCode || "",
        poNumber: globalData?.poNumber || "",
      });
    }

    newRows = await ensureSupplierPoNumbers(newRows);
    const overallTotal = newRows.reduce((acc, it) => acc + (Number(it.totalOrderValue) || 0), 0);
    onChange({
      selectedSuppliers: newRows,
      selectedSupplierL1: newRows[0]?.selectedSupplier || "",
      l1PriceQuoted: newRows[0]?.priceQuoted || 0,
      totalOrderValue: overallTotal,
      reasonForSelection: "L1 - LOWEST QUOTE",
    });
  };

  // Update a selected supplier entry in Section C
  const updateSelectedSupplier = async (idx, field, value) => {
    let current = [...selectedSuppliers];
    const val = typeof value === "string" ? value.toUpperCase() : value;
    current[idx] = { ...current[idx], [field]: val };

    if (field === "selectedSupplier") {
      const rawVal = String(value || "").trim();
      const valUpper = rawVal.toUpperCase();

      if (valUpper.startsWith("ALL__")) {
        const vendorName = valUpper.replace("ALL__", "").trim();
        const vendorQuotes = suppliers.filter(
          (s, i) => (s.supplierName || `SUPPLIER ${i + 1}`).trim().toUpperCase() === vendorName
        );
        let sumTotal = 0;
        let sumQty = 0;
        const firstSup = vendorQuotes[0] || {};
        const prodNames = [];

        vendorQuotes.forEach((s, sIdx) => {
          const p = Number(s.unitPriceNew) || Number(s.priceQuoted) || 0;
          const q = Number(s.qtyAvailable) || 1;
          const gstRateVal = parseFloat(String(s.gstRate || 0).replace("%", "")) || 0;
          const gstAmt = s.gstAmount !== undefined && s.gstAmount !== null && s.gstAmount !== ""
            ? Number(s.gstAmount)
            : Math.round((p * q * gstRateVal) / 100);
          const fr = Number(s.freightCharges) || 0;
          const disc = Number(s.discountOffered) || 0;
          sumTotal += (p * q + gstAmt + fr - disc);
          sumQty += q;
          const pName = s.selectedProduct || s.selectedTyreType || s.description || `Item ${sIdx + 1}`;
          if (pName) prodNames.push(pName);
        });

        current[idx] = {
          ...current[idx],
          selectedSupplier: vendorName,
          selectedProduct: prodNames.length > 0 ? prodNames.join(", ") : "ALL QUOTED ITEMS",
          quoteIndex: -1,
          isConsolidatedVendor: true,
          priceQuoted: vendorQuotes.length === 1 ? (Number(firstSup.unitPriceNew) || Number(firstSup.priceQuoted) || 0) : 0,
          allocatedQty: sumQty,
          qty: sumQty,
          totalOrderValue: sumTotal,
          reasonForSelection: current[idx].reasonForSelection || "L1 - LOWEST QUOTE (ALL ITEMS)",
          contactPerson: firstSup.contactPerson || "",
          supplierAddress: firstSup.supplierAddress || firstSup.address || "",
          address: firstSup.address || firstSup.supplierAddress || "",
          phoneNumber: firstSup.phoneNumber || "",
          emailWhatsApp: firstSup.emailWhatsApp || "",
          gstNumber: firstSup.gstNumber || "",
          bankName: firstSup.bankName || "",
          bankAccountNo: firstSup.bankAccountNo || "",
          bankIfscCode: firstSup.bankIfscCode || "",
          paymentTerms: firstSup.paymentTerms || "",
          deliveryLocation: firstSup.deliveryLocation || compProfile?.defaultDeliveryLocation || "",
          deliveryContact: firstSup.deliveryContact || compProfile?.defaultDeliveryContact || "",
          hsnCode: (() => {
            const hCodes = Array.from(new Set(vendorQuotes.map((q) => q.hsnCode).filter(Boolean)));
            return hCodes.length > 0 ? hCodes.join(", ") : (globalData?.stage1?.itemsRequired?.[0]?.hsnCode || "");
          })(),
          additionalRemarks: vendorQuotes.map((q) => q.remarks).filter(Boolean).join("; "),
          remarks: vendorQuotes.map((q) => q.remarks).filter(Boolean).join("; "),
        };
      } else {
        let quoteIdx = -1;
        if (valUpper.startsWith("QUOTE_")) {
          quoteIdx = parseInt(valUpper.replace("QUOTE_", ""), 10);
        } else {
          quoteIdx = suppliers.findIndex(
            (s, i) =>
              (s.supplierName || `SUPPLIER ${i + 1}`).toUpperCase() === valUpper ||
              `SUPPLIER ${i + 1}` === valUpper
          );
        }

        if (quoteIdx >= 0 && quoteIdx < suppliers.length) {
          const s = suppliers[quoteIdx];
          const newPrice = Number(s?.unitPriceNew) || 0;
          const remouldPrice = Number(s?.unitPriceRemould) || 0;
          const price = newPrice > 0 ? newPrice : (remouldPrice > 0 ? remouldPrice : (Number(s?.priceQuoted) || 0));
          const stage1ItemQty = Number(globalData?.stage1?.itemsRequired?.[quoteIdx]?.qty || 0);
          const qty = Number(s?.qtyAvailable) || (stage1ItemQty > 0 ? stage1ItemQty : 1);
          const freight = Number(s?.freightCharges) || 0;
          const discount = Number(s?.discountOffered) || 0;
          const gstRateVal = parseFloat(String(s?.gstRate || 0).replace("%", "")) || 0;
          const gstAmt = s?.gstAmount !== undefined && s?.gstAmount !== null && s?.gstAmount !== ""
            ? Number(s?.gstAmount)
            : Math.round((price * qty * gstRateVal) / 100);
          const total = price * qty + gstAmt + freight - discount;
          const sName = (s.supplierName || `SUPPLIER ${quoteIdx + 1}`).trim().toUpperCase();
          const prodName = s.selectedProduct || s.selectedTyreType || s.description || (globalData?.stage1?.itemsRequired?.[quoteIdx]?.productName) || `Item ${quoteIdx + 1}`;

          current[idx] = {
            ...current[idx],
            selectedSupplier: sName,
            selectedProduct: prodName,
            quoteIndex: quoteIdx,
            isConsolidatedVendor: false,
            priceQuoted: price,
            allocatedQty: qty,
            qty: qty,
            totalOrderValue: total > 0 ? total : (price * qty),
            reasonForSelection: current[idx].reasonForSelection || "L1 - LOWEST QUOTE",
            contactPerson: s.contactPerson || "",
            supplierAddress: s.supplierAddress || s.address || "",
            address: s.address || s.supplierAddress || "",
            phoneNumber: s.phoneNumber || "",
            emailWhatsApp: s.emailWhatsApp || "",
            gstNumber: s.gstNumber || "",
            bankName: s.bankName || "",
            bankAccountNo: s.bankAccountNo || "",
            bankIfscCode: s.bankIfscCode || "",
            paymentTerms: s.paymentTerms || "",
            gstRate: s.gstRate || "",
            gstAmount: gstAmt,
            deliveryLocation: s.deliveryLocation || compProfile?.defaultDeliveryLocation || "",
            deliveryContact: s.deliveryContact || compProfile?.defaultDeliveryContact || "",
            hsnCode: s.hsnCode || globalData?.stage1?.itemsRequired?.[quoteIdx]?.hsnCode || globalData?.stage1?.itemsRequired?.[0]?.hsnCode || "",
            additionalRemarks: s.remarks || "",
            remarks: s.remarks || "",
          };
        }
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
      reasonForSelection: current[0]?.reasonForSelection || "L1 - LOWEST QUOTE",
    });
  };

  // Auto-fill Section C Awarded Supplier if not yet selected on initial load
  useEffect(() => {
    const primarySelected = selectedSuppliers[0];
    const hasValidSelection = Boolean(primarySelected?.selectedSupplier && primarySelected.selectedSupplier.trim() !== "");

    if (!hasValidSelection && suppliers.length > 0) {
      const validIdx = suppliers.findIndex(
        (s) =>
          s.supplierName &&
          !s.supplierName.toUpperCase().startsWith("SUPPLIER ") &&
          (Number(s.unitPriceNew) > 0 || Number(s.priceQuoted) > 0)
      );
      if (validIdx !== -1 && suppliers[validIdx]?.supplierName) {
        updateSelectedSupplier(0, "selectedSupplier", `QUOTE_${validIdx}`);
      }
    }
  }, [suppliers.length]);

  const addSelectedSupplier = () => {
    const updated = [
      ...selectedSuppliers,
      {
        selectedSupplier: "",
        priceQuoted: 0,
        totalOrderValue: 0,
        reasonForSelection: "",
        poNumber: "",
        contactPerson: "",
        supplierAddress: "",
        address: "",
        deliveryLocation: "",
        deliveryContact: "",
        hsnCode: "",
        gstRate: "",
        gstAmount: 0,
      },
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
      {/* PR Confirmation & Approval Proof Banner for Purchase Team */}
      {(globalData?.approvalProof || globalData?.stage1?.approvalProof) && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderLeft: "6px solid #16a34a",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>📎</span>
            <span style={{ fontWeight: 700, fontSize: "12.5px", color: "#166534" }}>
              PR Confirmation & Approval Proof Attached:
            </span>
            <span style={{ fontWeight: 600, fontSize: "12px", color: "#1e293b" }}>
              {(globalData.approvalProof || globalData.stage1.approvalProof).fileName || "Proof Document"}
            </span>
          </div>
          {(globalData.approvalProof?.fileUrl || globalData.stage1?.approvalProof?.fileUrl) && (
            <a
              href={globalData.approvalProof?.fileUrl || globalData.stage1?.approvalProof?.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#2563eb",
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              View Approval Proof <OpenInNew sx={{ fontSize: 13 }} />
            </a>
          )}
        </div>
      )}

      {/* Spotlight Card: PO Layout Format Selection (Moved from Stage 1 - Fixed to A4 Page Dimensions) */}
      <div
        style={{
          background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
          border: "2px solid #8b5cf6",
          borderLeft: "6px solid #6d28d9",
          borderRadius: "8px",
          padding: "12px 16px",
          boxShadow: "0 2px 8px rgba(109, 40, 217, 0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontWeight: 800, fontSize: "13px", color: "#5b21b6", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📄</span>
            <span>PO Layout Format (Standard A4 Page Sizing)</span>
          </label>
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              padding: "2px 8px",
              borderRadius: "10px",
              backgroundColor: "#7c3aed",
              color: "#ffffff",
              boxShadow: "0 1px 2px rgba(109, 40, 217, 0.2)",
            }}
          >
            A4 Print & PDF Output
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "12px", alignItems: "center" }}>
          <select
            className="sop-input"
            style={{
              fontWeight: 700,
              fontSize: "13px",
              height: "38px",
              borderColor: "#7c3aed",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
              cursor: "pointer",
            }}
            value={globalData?.poFormatStyle || "letterhead"}
            onChange={(e) => onGlobalChange && onGlobalChange("poFormatStyle", e.target.value)}
          >
            <option value="letterhead">📜 Official Company Letterhead (Built-in Logo & A4 Margins)</option>
            <option value="standard">📄 Standard PO (Standalone Logo & Clean Box Layout)</option>
            <option value="plain">🖨️ Plain Body (Pre-Printed Stationery Top Margin)</option>
          </select>

          <div style={{ fontSize: "11px", color: "#6b21a8", fontWeight: 600 }}>
            {(globalData?.poFormatStyle || "letterhead") === "letterhead" && (
              <span>📜 <strong>Official Letterhead:</strong> Full company graphic letterhead frame with official header, addresses, and footer.</span>
            )}
            {globalData?.poFormatStyle === "standard" && (
              <span>📄 <strong>Standard PO:</strong> Clean A4 box layout with standalone top-left company logo and buyer PAN/GSTIN.</span>
            )}
            {globalData?.poFormatStyle === "plain" && (
              <span>🖨️ <strong>Plain Body:</strong> 85mm top blank margin reserved for pre-printed physical company stationery.</span>
            )}
          </div>
        </div>
      </div>

      {/* Requester Attachments & Notes from Stage 1 */}
      {((globalData?.stage1?.attachments && globalData.stage1.attachments.length > 0) ||
        (globalData?.stage1?.additionalInformation) ||
        (globalData?.attachments && globalData.attachments.length > 0) ||
        (globalData?.additionalInformation)) && (
        <div
          style={{
            background: "#eff6ff",
            border: "1.5px solid #bfdbfe",
            borderLeft: "5px solid #2563eb",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "12.5px", color: "#1e40af", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📎</span>
              <span>Requester Attachments & Instructions (Handed over from Stage 1)</span>
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", backgroundColor: "#ffffff", padding: "1px 8px", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
              Purchase Team Review
            </span>
          </div>

          {/* File Chips */}
          {((globalData?.stage1?.attachments || globalData?.attachments || [])).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
              {(globalData?.stage1?.attachments || globalData?.attachments || []).map((att, attIdx) => {
                const fullUrl = att.fileUrl?.startsWith("http")
                  ? att.fileUrl
                  : `${process.env.REACT_APP_API_STRING?.replace(/\/api$/, "") || ""}${att.fileUrl}`;
                return (
                  <a
                    key={attIdx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #93c5fd",
                      borderRadius: "4px",
                      padding: "3px 8px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "#1d4ed8",
                      textDecoration: "none",
                    }}
                    title={att.fileName}
                  >
                    <span>📄</span>
                    <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {att.fileName}
                    </span>
                    <OpenInNew style={{ fontSize: "12px" }} />
                  </a>
                );
              })}
            </div>
          )}

          {/* Additional Notes */}
          {(globalData?.stage1?.additionalInformation || globalData?.additionalInformation) && (
            <div style={{ fontSize: "12px", color: "#1e293b", backgroundColor: "#ffffff", padding: "6px 10px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
              <strong style={{ color: "#1e40af" }}>Requester Notes: </strong>
              {globalData?.stage1?.additionalInformation || globalData?.additionalInformation}
            </div>
          )}
        </div>
      )}

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

        {/* Checked By Approver Pair Selector */}
        <div style={{ marginTop: "12px", borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
          <ApproverPairSelector
            compact={false}
            name={data.checkedBy || globalData?.checkedBy || globalData?.stage1?.checkedBy || compProfile?.settings?.hodApproverName || "MOHIT SINGH"}
            designation={data.checkedByDesignation || globalData?.checkedByDesignation || globalData?.stage1?.checkedByDesignation || compProfile?.settings?.hodApproverDesignation || "CEO"}
            label="Checked By"
            role="CHECKED_BY"
            onPairChange={({ name: newName, designation: newDesig }) => {
              updateField("checkedBy", newName);
              updateField("checkedByDesignation", newDesig);
              if (onGlobalChange) {
                onGlobalChange("checkedBy", newName);
                onGlobalChange("checkedByDesignation", newDesig);
              }
            }}
          />
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
                      {suppliers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSupplier(idx)}
                          title="Remove quotation"
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "4px",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "2px 6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "11px",
                            fontWeight: 600,
                            transition: "all 0.2s"
                          }}
                        >
                          <Delete style={{ fontSize: "14px" }} /> Remove
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
                      onBlur={() => saveSupplierDetails(suppliers[idx])}
                      placeholder="Type or select supplier"
                    />
                  </td>
                ))}
              </tr>

              {/* Supplier Address */}
              <tr>
                <td style={{ fontWeight: 600 }}>Supplier Address</td>
                {suppliers.map((sup, idx) => (
                  <td key={idx}>
                    <input
                      className="sop-input"
                      value={sup.supplierAddress || sup.address || ""}
                      onChange={(e) => {
                        updateSupplierField(idx, "supplierAddress", e.target.value);
                        updateSupplierField(idx, "address", e.target.value);
                      }}
                      onBlur={() => saveSupplierDetails(suppliers[idx])}
                      placeholder="Supplier Address / City / State"
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
                      onBlur={() => saveSupplierDetails(suppliers[idx])}
                      placeholder="e.g. Contact Person"
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
                ["HSN / SAC Code", "hsnCode", "text"],
                ["Brand", "tyreBrand", "text"],
                ["Specification", "sizeSpecification", "text"],
                ["Unit Price (₹)", "unitPriceNew", "number"],
                ["Unit Price – Secondary / Refurbished (₹)", "unitPriceRemould", "number"],
                ["Qty Available", "qtyAvailable", "number"],
                ["GST Rate (%)", "gstRate", "datalist", ["0%", "5%", "12%", "18%", "28%"]],
                ["GST Amount (₹)", "gstAmount", "number"],
                ["Freight Charges", "freightCharges", "number"],
                ["Delivery Timeline", "deliveryTimeline", "text"],
                ["Delivery Location", "deliveryLocation", "text"],
                ["Delivery Contact", "deliveryContact", "text"],
                ["Warranty / Guarantee", "warrantyGuarantee", "text"],
                ["Payment Terms : Adv / Days", "paymentTerms", "datalist", ["100% ADVANCE", "15 DAYS CREDIT", "30 DAYS CREDIT", "45 DAYS CREDIT", "60 DAYS CREDIT", "90 DAYS CREDIT", "AGAINST DELIVERY"]],
                ["Discount Offered", "discountOffered", "number"],
                ["Remarks", "remarks", "text"],
              ].map(([label, field, type, options]) => (
                <tr key={field}>
                  <td style={{ fontWeight: 600 }}>
                    {field === "deliveryLocation" ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const loc = globalData?.stage1?.deliveryLocation || compProfile.defaultDeliveryLocation;
                            suppliers.forEach((_, sIdx) => updateSupplierField(sIdx, "deliveryLocation", loc));
                          }}
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            color: "#0284c7",
                            background: "#e0f2fe",
                            border: "1px solid #bae6fd",
                            borderRadius: "3px",
                            padding: "1px 5px",
                            cursor: "pointer",
                          }}
                          title="Apply company delivery location to all quotations"
                        >
                          Use {compProfile.id} Location
                        </button>
                      </div>
                    ) : field === "deliveryContact" ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const ctc = globalData?.stage1?.deliveryContact || compProfile.defaultDeliveryContact;
                            suppliers.forEach((_, sIdx) => updateSupplierField(sIdx, "deliveryContact", ctc));
                          }}
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            color: "#0284c7",
                            background: "#e0f2fe",
                            border: "1px solid #bae6fd",
                            borderRadius: "3px",
                            padding: "1px 5px",
                            cursor: "pointer",
                          }}
                          title="Apply company delivery contact to all quotations"
                        >
                          Use {compProfile.id} Contact
                        </button>
                      </div>
                    ) : (
                      label
                    )}
                    {type === "datalist" && (
                      <datalist id={`datalist-${field}`}>
                        {options.map((opt, oIdx) => (
                          <option key={oIdx} value={opt} />
                        ))}
                      </datalist>
                    )}
                  </td>
                  {suppliers.map((sup, idx) => (
                    <td key={idx}>
                      {type === "select" ? (
                        <select
                          className="sop-input"
                          value={sup?.[field] ?? ""}
                          onChange={(e) => updateSupplierField(idx, field, e.target.value)}
                          onBlur={() => saveProductDetails(suppliers[idx])}
                        >
                          <option value="">Select Terms</option>
                          {options.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={type === "datalist" ? "text" : type}
                          list={type === "datalist" ? `datalist-${field}` : undefined}
                          className="sop-input"
                          value={sup?.[field] ?? ""}
                          onChange={(e) => updateSupplierField(idx, field, (type === "text" || type === "datalist") ? e.target.value.toUpperCase() : e.target.value)}
                          onBlur={() => saveProductDetails(suppliers[idx])}
                          style={type === "number" ? { textAlign: "right" } : {}}
                        />
                      )}
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

        {/* Quick Multi-Item Award Actions Banner */}
        {(() => {
          const vendorCounts = {};
          suppliers.forEach((s) => {
            const sName = (s.supplierName || "").trim().toUpperCase();
            if (sName && !sName.startsWith("SUPPLIER ")) {
              vendorCounts[sName] = (vendorCounts[sName] || 0) + 1;
            }
          });
          const multiQuoteVendors = Object.keys(vendorCounts).filter((k) => vendorCounts[k] > 1);
          if (multiQuoteVendors.length === 0) return null;

          return (
            <div
              style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1.5px solid #60a5fa",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {multiQuoteVendors.map((vName) => {
                const vQuotes = suppliers.filter((s) => (s.supplierName || "").trim().toUpperCase() === vName);
                const vSum = vQuotes.reduce((sum, q) => {
                  const p = Number(q.unitPriceNew) || Number(q.priceQuoted) || 0;
                  const qQty = Number(q.qtyAvailable) || 1;
                  const gstRateVal = parseFloat(String(q.gstRate || 0).replace("%", "")) || 0;
                  const gstAmt = q.gstAmount !== undefined && q.gstAmount !== null && q.gstAmount !== ""
                    ? Number(q.gstAmount)
                    : Math.round((p * qQty * gstRateVal) / 100);
                  return sum + (p * qQty + gstAmt + (Number(q.freightCharges) || 0) - (Number(q.discountOffered) || 0));
                }, 0);

                return (
                  <div key={vName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ fontSize: "12.5px", color: "#1e40af" }}>
                      <strong>📦 Multiple Items from {vName}:</strong> Found <strong>{vQuotes.length} item quotes</strong> totaling <strong>₹{vSum.toLocaleString("en-IN")}</strong>.
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => handleAwardAllFromVendor(vName)}
                        style={{
                          backgroundColor: "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "5px 12px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 1px 3px rgba(22, 163, 74, 0.3)",
                        }}
                      >
                        🏆 Award All {vQuotes.length} Items to {vName} (Single PO: ₹{vSum.toLocaleString("en-IN")})
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePopulateAllItemRows(vName)}
                        style={{
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "5px 12px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 1px 3px rgba(37, 99, 235, 0.3)",
                        }}
                      >
                        ➕ Auto-Add {vQuotes.length} Item Lines for {vName}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {selectedSuppliers.map((item, idx) => (
          <div key={idx} style={{ background: "#f8fafc", padding: "10px", borderRadius: "4px", border: "1px solid #e2e8f0", marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 700, fontSize: "12px", color: "#1d4ed8" }}>
                Awarded Supplier #{idx + 1}
                {item.selectedProduct && (
                  <span style={{ marginLeft: "8px", color: "#475569", fontWeight: 600, fontSize: "11.5px" }}>
                    — {item.selectedProduct}
                  </span>
                )}
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
                <label className="sop-field-label">Selected Quote / Supplier</label>
                <select
                  className="sop-select"
                  value={
                    item.isConsolidatedVendor && item.selectedSupplier
                      ? `ALL__${item.selectedSupplier.toUpperCase()}`
                      : (item.quoteIndex !== undefined && item.quoteIndex !== null && item.quoteIndex >= 0)
                      ? `QUOTE_${item.quoteIndex}`
                      : (() => {
                          const mIdx = suppliers.findIndex(
                            (s, i) =>
                              (s.supplierName || `SUPPLIER ${i + 1}`).trim().toUpperCase() === (item.selectedSupplier || "").trim().toUpperCase() &&
                              (!item.selectedProduct || (s.selectedProduct || s.selectedTyreType || "").trim().toUpperCase() === item.selectedProduct.trim().toUpperCase())
                          );
                          return mIdx !== -1 ? `QUOTE_${mIdx}` : (item.selectedSupplier || "").toUpperCase();
                        })()
                  }
                  onChange={(e) => updateSelectedSupplier(idx, "selectedSupplier", e.target.value)}
                  style={{ fontWeight: 600, color: "#1d4ed8" }}
                >
                  <option value="">Select Quote / Supplier</option>
                  {/* Group consolidated vendor options first for any vendor with multiple quotes */}
                  {Array.from(
                    new Set(
                      suppliers
                        .map((s) => (s.supplierName || "").trim().toUpperCase())
                        .filter((name) => name && !name.startsWith("SUPPLIER "))
                    )
                  ).map((vName) => {
                    const vQuotes = suppliers.filter(
                      (s) => (s.supplierName || "").trim().toUpperCase() === vName
                    );
                    if (vQuotes.length <= 1) return null;
                    const vSum = vQuotes.reduce((sum, q) => {
                      const p = Number(q.unitPriceNew) || Number(q.priceQuoted) || 0;
                      const qty = Number(q.qtyAvailable) || 1;
                      const gstRateVal = parseFloat(String(q.gstRate || 0).replace("%", "")) || 0;
                      const gstAmt = q.gstAmount !== undefined && q.gstAmount !== null && q.gstAmount !== ""
                        ? Number(q.gstAmount)
                        : Math.round((p * qty * gstRateVal) / 100);
                      return sum + (p * qty + gstAmt + (Number(q.freightCharges) || 0) - (Number(q.discountOffered) || 0));
                    }, 0);
                    return (
                      <option key={`ALL__${vName}`} value={`ALL__${vName}`} style={{ fontWeight: 700, color: "#166534" }}>
                        ⭐ ALL ITEMS: {vName} ({vQuotes.length} Items — Total: ₹{vSum.toLocaleString("en-IN")})
                      </option>
                    );
                  })}

                  {/* Individual quotes per column */}
                  {suppliers.map((s, i) => {
                    const rawName = s.supplierName || `SUPPLIER ${i + 1}`;
                    const sName = rawName.toUpperCase();
                    const pName = s.selectedProduct || s.selectedTyreType || s.description || (globalData?.stage1?.itemsRequired?.[i]?.productName) || `Item ${i + 1}`;
                    const price = Number(s.unitPriceNew) || Number(s.priceQuoted) || 0;
                    const qty = Number(s.qtyAvailable) || 1;
                    const lineTotal = Math.round(price * qty * 100) / 100;
                    return (
                      <option key={i} value={`QUOTE_${i}`}>
                        Quote #{i + 1}: {sName} — {pName} (Qty: {qty} @ ₹{price} = ₹{lineTotal})
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
                <label className="sop-field-label">Allocated Qty</label>
                <input
                  type="number"
                  className="sop-input"
                  value={item.allocatedQty ?? item.qty ?? (Number(item.priceQuoted) > 0 ? Math.round(Number(item.totalOrderValue) / Number(item.priceQuoted)) : 0)}
                  onChange={(e) => {
                    const newQty = Number(e.target.value) || 0;
                    updateSelectedSupplier(idx, "allocatedQty", newQty);
                    updateSelectedSupplier(idx, "qty", newQty);
                  }}
                  style={{ textAlign: "right", fontWeight: 600 }}
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
              <div className="sop-field-group">
                <label className="sop-field-label">Contact Person</label>
                <input
                  className="sop-input"
                  value={item.contactPerson || ""}
                  onChange={(e) => updateSelectedSupplier(idx, "contactPerson", e.target.value.toUpperCase())}
                  placeholder="Contact Person"
                />
              </div>
              <div className="sop-field-group">
                <label className="sop-field-label">HSN / SAC Code</label>
                <input
                  className="sop-input"
                  value={item.hsnCode || ""}
                  onChange={(e) => updateSelectedSupplier(idx, "hsnCode", e.target.value.toUpperCase())}
                  placeholder="HSN / SAC Code"
                />
              </div>
              <div className="sop-field-group" style={{ gridColumn: "span 2" }}>
                <label className="sop-field-label">Supplier Address</label>
                <input
                  className="sop-input"
                  value={item.supplierAddress || item.address || ""}
                  onChange={(e) => {
                    updateSelectedSupplier(idx, "supplierAddress", e.target.value.toUpperCase());
                    updateSelectedSupplier(idx, "address", e.target.value.toUpperCase());
                  }}
                  placeholder="Supplier Address"
                />
              </div>
              <div className="sop-field-group" style={{ gridColumn: "span 2" }}>
                <label className="sop-field-label">Additional Remarks (shown in PO)</label>
                <input
                  className="sop-input"
                  value={item.additionalRemarks || item.remarks || ""}
                  onChange={(e) => {
                    updateSelectedSupplier(idx, "additionalRemarks", e.target.value.toUpperCase());
                    updateSelectedSupplier(idx, "remarks", e.target.value.toUpperCase());
                  }}
                  placeholder="e.g. SPECIAL INSTRUCTIONS / WARRANTY CLAUSE"
                />
              </div>
            </div>
          </div>
        ))}

        {/* PO Setting: Inclusive of GST & Freight Toggle */}
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="sop-btn"
            onClick={() => updateField("isGstFreightIncluded", !data.isGstFreightIncluded)}
            style={{
              backgroundColor: data.isGstFreightIncluded ? "#15803d" : "#f8fafc",
              color: data.isGstFreightIncluded ? "#ffffff" : "#1e293b",
              border: `1px solid ${data.isGstFreightIncluded ? "#15803d" : "#cbd5e1"}`,
              fontWeight: 700,
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: data.isGstFreightIncluded ? "0 2px 4px rgba(21, 128, 61, 0.25)" : "none",
            }}
          >
            {data.isGstFreightIncluded
              ? "✓ Inclusive of GST & Freight (Enabled in PO Total)"
              : "+ Show 'Inclusive of GST & Freight' beside PO Total"}
          </button>
        </div>
      </div>

      {/* Section D: Custom Terms & Conditions for Purchase Order */}
      <div className="sop-card">
        <div className="sop-card-title">
          <span>D. Terms & Conditions for Purchase Order</span>
          <button
            type="button"
            className="sop-btn primary"
            onClick={() => {
              const currentTerms = Array.isArray(data.customTerms) && data.customTerms.length > 0 ? [...data.customTerms] : [...DEFAULT_TERMS];
              currentTerms.push("");
              onChange({ customTerms: currentTerms });
            }}
          >
            <Add style={{ fontSize: "14px" }} /> Add Term & Condition
          </button>
        </div>
        <div style={{ marginBottom: "8px", fontSize: "12px", color: "#64748b" }}>
          Enter custom terms and conditions line-by-line. They will be displayed directly in the Purchase Order PDF.
        </div>
        <div className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "45px", textAlign: "center" }}>#</th>
                <th>Term & Condition Description</th>
                <th style={{ width: "70px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(data.customTerms) && data.customTerms.length > 0 ? data.customTerms : DEFAULT_TERMS).map((term, tIdx) => (
                <tr key={tIdx}>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "#1d4ed8" }}>{tIdx + 1}</td>
                  <td>
                    <input
                      className="sop-input"
                      value={term}
                      onChange={(e) => {
                        const currentTerms = Array.isArray(data.customTerms) && data.customTerms.length > 0 ? [...data.customTerms] : [...DEFAULT_TERMS];
                        currentTerms[tIdx] = e.target.value;
                        onChange({ customTerms: currentTerms });
                      }}
                      placeholder={`Terms & Condition #${tIdx + 1}`}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const currentTerms = Array.isArray(data.customTerms) && data.customTerms.length > 0 ? [...data.customTerms] : [...DEFAULT_TERMS];
                        currentTerms.splice(tIdx, 1);
                        onChange({ customTerms: currentTerms });
                      }}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                      title="Delete Term"
                    >
                      <Delete style={{ fontSize: "16px" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section E: Routing & Checklist */}
      <div className="sop-card">
        <div className="sop-card-title">E. Routing & Checklist</div>
        <div className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>Check</th>
                <th style={{ width: "65px" }}>Step</th>
                <th>Action</th>
                <th style={{ width: "100px" }}>Date</th>
                <th style={{ width: "65px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[{ step: "Step 1", action: "Sent to Finance Manager for approval" }].map(
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

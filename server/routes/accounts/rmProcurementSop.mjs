import express from "express";
import XLSX from "xlsx";
import RmProcurementSop from "../../model/accounts/rmProcurementSop.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();

// ─── Helpers ───
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

function computeDoc(doc) {
  const clone = JSON.parse(JSON.stringify(doc));

  // Sheet 1: total estimated weight per product line
  clone.stage1?.productLines?.forEach((line) => {
    line.totalEstWeight = (Number(line.qtyOrdered) || 0) * (Number(line.estUnitWeight) || 0);
  });

  // Sheet 4: variance % per RM type
  clone.stage4?.rateValidations?.forEach((rv) => {
    const quoted = Number(rv.l1QuotedRate) || 0;
    const market = Number(rv.marketRate) || 0;
    rv.variancePercent = quoted > 0 && market > 0 ? ((quoted - market) / market) * 100 : 0;
  });

  // Sheet 8: shortage / excess
  clone.stage8?.rmReceiptInspection?.forEach((item) => {
    item.shortageExcess = (Number(item.receivedQty) || 0) - (Number(item.orderedQty) || 0);
  });

  return clone;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyRow(cols) {
  return Array(cols).fill("");
}

// ─── CRUD Routes ───

// List PRs
router.get("/rm-procurement", authMiddleware, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { prNumber: regex },
        { salesOrderRefNo: regex },
        { "stage1.customerName": regex },
        { "stage3.selectedSupplierL1": regex },
        { "stage6.supplierName": regex },
        { "stage8.supplierName": regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      RmProcurementSop.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RmProcurementSop.countDocuments(query),
    ]);

    const data = items.map(computeDoc);
    res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    logger.error("Error listing RM Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single PR
router.get("/rm-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await RmProcurementSop.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "PR not found" });
    }
    res.json({ success: true, data: computeDoc(doc) });
  } catch (error) {
    logger.error("Error fetching RM Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create PR
router.post("/rm-procurement", authMiddleware, async (req, res) => {
  try {
    const { prNumber } = req.body;
    if (!prNumber?.trim()) {
      return res.status(400).json({ success: false, message: "PR Number is required" });
    }
    const existing = await RmProcurementSop.findOne({ prNumber: prNumber.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "PR Number already exists" });
    }
    const doc = new RmProcurementSop(req.body);
    await doc.save();
    res.status(201).json({ success: true, data: computeDoc(doc.toObject()) });
  } catch (error) {
    logger.error("Error creating RM Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update PR
router.put("/rm-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const { prNumber } = req.body;
    const existing = await RmProcurementSop.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "PR not found" });
    }
    if (prNumber && prNumber.trim() !== existing.prNumber) {
      const duplicate = await RmProcurementSop.findOne({ prNumber: prNumber.trim() });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "PR Number already exists" });
      }
    }
    const doc = await RmProcurementSop.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();
    res.json({ success: true, data: computeDoc(doc) });
  } catch (error) {
    logger.error("Error updating RM Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete PR
router.delete("/rm-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await RmProcurementSop.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "PR not found" });
    }
    res.json({ success: true, message: "PR deleted successfully" });
  } catch (error) {
    logger.error("Error deleting RM Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Excel Export ───

function buildStage1Sheet(d) {
  const s1 = d.stage1 || {};
  const rows = [
    ["SALES ORDER INTAKE & RAW MATERIAL ESTIMATION", "", "", "", "", "", "", "", "", ""],
    ["Sales Person", "Production Team", "HDPE Crates & Bins", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 1 of 8  –  Sales Person captures customer order → Estimates RM → Notifies Production Timeline", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["A. Customer Order Details", "", "", "", "", "", "", "", "", ""],
    ["Customer Name", s1.customerName || "", "", "", "Customer Contact / PO No.", s1.customerContactPoNo || "", "", "", "", ""],
    ["Order Date", fmtDate(s1.orderDate), "", "", "Required Delivery Date", fmtDate(s1.requiredDeliveryDate), "", "", "", ""],
    ["Sales Person Name", s1.salesPersonName || "", "", "", "Sales Order Reference No.", s1.salesOrderRefNo || "", "", "", "", ""],
    emptyRow(10),
    ["B. Product / Bin Specifications Required", "", "", "", "", "", "", "", "", ""],
    ["S.No", "Product Type", "Bin Size (L×W×H mm)", "Bottom Type", "Handle Type", "Lid Required?", "Colour", "Qty Ordered", "Est. Unit Weight (kg)", "Total Est. Weight (kg)"],
  ];

  const lines = s1.productLines || [];
  for (let i = 0; i < 5; i++) {
    const line = lines[i] || {};
    const qty = safeNumber(line.qtyOrdered);
    const unitW = safeNumber(line.estUnitWeight);
    rows.push([
      i + 1,
      line.productType || "",
      line.binSize || "",
      line.bottomType || "",
      line.handleType || "",
      line.lidRequired || "",
      line.colour || "",
      qty,
      unitW,
      { f: `H${rows.length + 1}*I${rows.length + 1}` },
    ]);
  }

  rows.push(emptyRow(10));
  rows.push(["C. Raw Material Estimation (by Sales / Production Team)", "", "", "", "", "", "", "", "", ""]);
  rows.push(["RM Type", "Grade / Specification", "Required Qty (kg)", "Unit", "Current Stock (kg)", "Net RM to Purchase (kg)", "", "", "", ""]);
  const rmEstimates = s1.rmEstimates || [];
  const defaultRm = [
    ["Virgin HDPE Granule", "ICOL - 180M50"],
    ["rHDPE Granule (Recycled)", "Blue / Grey Grade"],
    ["Colour Masterbatch", "Blue / Grey"],
    ["UV Masterbatch", "Standard UV Grade"],
  ];
  defaultRm.forEach(([rmType, grade], i) => {
    const est = rmEstimates[i] || {};
    rows.push([rmType, grade, safeNumber(est.requiredQty), est.unit || "kg", safeNumber(est.currentStock), safeNumber(est.netRmToPurchase), "", "", "", ""]);
  });

  rows.push(emptyRow(10));
  rows.push(["D. Partition Details (if applicable)", "", "", "", "", "", "", "", "", ""]);
  const pd = s1.partitionDetails || {};
  rows.push(["Bin / Crate Size (L×W×H)", pd.binCrateSize || "", "", "", "", "", "No. of Partitions", pd.noOfPartitions || "", "", ""]);
  rows.push(["Partition Size (L×W)", pd.partitionSize || "", "", "", "", "", "No. of Pocket Partitions", pd.noOfPocketPartitions || "", "", ""]);
  rows.push(["Partition Material / Colour", pd.partitionMaterialColour || "", "", "", "", "", "Special Instructions", pd.specialInstructions || "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["E. Production Timeline", "", "", "", "", "", "", "", "", ""]);
  const pt = s1.productionTimeline || {};
  rows.push(["Estimated Production Start Date", fmtDate(pt.estProductionStartDate), "", "", "Estimated Completion Date", fmtDate(pt.estCompletionDate), "", "", "", ""]);
  rows.push(["Production Head Intimated On", fmtDate(pt.productionHeadIntimatedOn), "", "", "RM Required By Date", fmtDate(pt.rmRequiredByDate), "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["F. Sign-Off", "", "", "", "", "", "", "", "", ""]);
  const so = s1.signOff || {};
  rows.push(["Sales Person Signature / Name", so.salesPersonSignatureName || "", "", "", "Date", fmtDate(so.salesPersonDate), "", "", "", ""]);
  rows.push(["Reviewed by Production Head", so.reviewedByProductionHead || "", "", "", "Date", fmtDate(so.productionHeadDate), "", "", "", ""]);
  rows.push(["Once confirmed by Production Head, PR must be raised within 24 hours by the designated factory person.", "", "", "", "", "", "", "", "", ""]);

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage2Sheet(d) {
  const s2 = d.stage2 || {};
  const rows = [
    ["PURCHASE REQUEST (PR) – RAW MATERIALS", "", "", "", "", "", "", "", "", ""],
    ["HDPE Crates & Bins Manufacturing", "Raised by Factory PR Person, Approved by Production Head", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 2 of 8  –  PR Person raises request → Production Head approves → Sent to Purchase Officer", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["A. PR Identity", "", "", "", "", "", "", "", "", ""],
    ["PR Number", s2.prNumber || d.prNumber || "", "", "PR-HDPE-2025-___", "PR Date", fmtDate(s2.prDate), "", "", "", ""],
    ["Raised By (Name)", s2.raisedBy || "", "", "", "Contact Number", s2.contactNumber || "", "", "", "", ""],
    ["Sales Order Reference No.", s2.salesOrderRefNo || "", "", "", "RM Required By Date", fmtDate(s2.rmRequiredByDate), "", "", "", ""],
    emptyRow(10),
    ["B. Raw Materials Requested", "", "", "", "", "", "", "", "", ""],
    ["S.No", "RM Type", "Grade / Specification", "Required Qty (kg)", "Unit", "Preferred Supplier", "Required Certificates / Documents", "", "", ""],
  ];

  const materials = s2.rawMaterials || [];
  const defaultMaterials = [
    ["Virgin HDPE Granule", "ICOL - 180M50", "COA, MSDS, Mfg Certificate, Test Report"],
    ["rHDPE Granule (Recycled)", "Blue / Grey Grade", "Material Quality Declaration"],
    ["Colour Masterbatch", "Blue / Grey", "Technical Data Sheet (TDS)"],
    ["UV Masterbatch", "Standard UV Grade", "Technical Data Sheet (TDS)"],
  ];
  for (let i = 0; i < 7; i++) {
    const mat = materials[i] || {};
    const [defType, defGrade, defCert] = defaultMaterials[i] || ["", "", ""];
    rows.push([
      i + 1,
      mat.rmType || defType,
      mat.grade || defGrade,
      safeNumber(mat.requiredQty),
      mat.unit || "kg",
      mat.preferredSupplier || "",
      mat.requiredCertificatesDocuments || defCert,
      "",
      "",
      "",
    ]);
  }

  rows.push(emptyRow(10));
  rows.push(["C. Bin / Product Reference (from Sales Order)", "", "", "", "", "", "", "", "", ""]);
  const bpr = s2.binProductReference || {};
  rows.push(["Bin / Crate Types Required", bpr.binCrateTypesRequired || "", "", "", "", "", "", "", "", ""]);
  rows.push(["Total Production Quantity", bpr.totalProductionQuantity || "", "", "", "Total Estimated RM Weight (kg)", bpr.totalEstimatedRmWeight || "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["D. Production Head Approval", "", "", "", "", "", "", "", "", ""]);
  const pha = s2.productionHeadApproval || {};
  rows.push(["Production Head Name", pha.productionHeadName || "", "", "", "Approval Date", fmtDate(pha.approvalDate), "", "", "", ""]);
  rows.push(["Approval Decision", pha.approvalDecision || "", "", "APPROVED – Forward to Purchase Officer / REJECTED – Revise and resubmit", "", "", "", "", "", ""]);
  rows.push(["Remarks / Instructions", pha.remarks || "", "", "", "", "", "", "", "", ""]);
  rows.push(["Signature / Approval Mode", pha.signatureApprovalMode || "", "", "", "WhatsApp / Email / In-Person", "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["Step", "Action / Task", "", "", "Responsible Person", "", "Date / Time", "", "", "Status"]);
  const log = s2.actionLog || [];
  const defaultLog = [
    ["PR raised by factory person", "Factory PR Person"],
    ["Reviewed & approved by Production Head", "Production Head"],
    ["PR forwarded to Purchase Officer", "Production Head / PR Person"],
  ];
  for (let i = 0; i < 3; i++) {
    const l = log[i] || {};
    rows.push([i + 1, l.actionTask || defaultLog[i]?.[0] || "", "", "", l.responsiblePerson || defaultLog[i]?.[1] || "", "", fmtDate(l.dateTime), "", "", l.status || ""]);
  }
  rows.push(["Mandatory: Mention required certificate/document for each RM type. Purchase Officer will collect these from supplier.", "", "", "", "", "", "", "", "", ""]);

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage3Sheet(d) {
  const s3 = d.stage3 || {};
  const rows = [
    ["SUPPLIER QUOTATION COMPARISON – RAW MATERIALS", "", "", "", "", "", "", "", "", ""],
    ["Purchase Officer Use Only", "Minimum 2 to 3 Quotes Required per RM", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 3 of 8  –  PO collects 2–3 quotes → Reviews all specs & documents → Selects lowest rate supplier", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["A. Reference Details", "", "", "", "", "", "", "", "", ""],
    ["PR Number", s3.prNumber || d.prNumber || "", "", "", "Comparison Date", fmtDate(s3.comparisonDate), "", "", "", ""],
    ["Purchase Officer Name", s3.purchaseOfficerName || "", "", "", "Contact Number", s3.contactNumber || "", "", "", "", ""],
    emptyRow(10),
    ["B. Quotation Comparison Table", "", "", "", "", "", "", "", "", ""],
    ["Field", "Supplier 1", "Supplier 2", "Supplier 3", "", "", "", "", "", ""],
  ];

  const suppliers = s3.suppliers || [];
  const sup = (i) => suppliers[i] || {};
  rows.push(["Supplier Name", sup(0).supplierName || "", sup(1).supplierName || "", sup(2).supplierName || "", "", "", "", "", "", ""]);
  rows.push(["Contact Person", sup(0).contactPerson || "", sup(1).contactPerson || "", sup(2).contactPerson || "", "", "", "", "", "", ""]);
  rows.push(["Phone / WhatsApp", sup(0).phone || "", sup(1).phone || "", sup(2).phone || "", "", "", "", "", "", ""]);
  rows.push(["Email", sup(0).email || "", sup(1).email || "", sup(2).email || "", "", "", "", "", "", ""]);
  rows.push(["GST Number", sup(0).gstNumber || "", sup(1).gstNumber || "", sup(2).gstNumber || "", "", "", "", "", "", ""]);

  rows.push(["─── VIRGIN HDPE GRANULE (ICOL-180M50) ───", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Rate per kg (₹)", safeNumber(sup(0).virginHdpe?.ratePerKg), safeNumber(sup(1).virginHdpe?.ratePerKg), safeNumber(sup(2).virginHdpe?.ratePerKg), "", "", "", "", "", ""]);
  rows.push(["Qty Available (kg)", safeNumber(sup(0).virginHdpe?.qtyAvailable), safeNumber(sup(1).virginHdpe?.qtyAvailable), safeNumber(sup(2).virginHdpe?.qtyAvailable), "", "", "", "", "", ""]);
  rows.push(["Brand / Origin", sup(0).virginHdpe?.brandOrigin || "", sup(1).virginHdpe?.brandOrigin || "", sup(2).virginHdpe?.brandOrigin || "", "", "", "", "", "", ""]);
  rows.push(["Certificates Provided", sup(0).virginHdpe?.certificatesProvided || "", sup(1).virginHdpe?.certificatesProvided || "", sup(2).virginHdpe?.certificatesProvided || "", "", "", "", "", "", ""]);

  rows.push(["─── rHDPE GRANULE (Blue/Grey) ───", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Rate per kg (₹)", safeNumber(sup(0).rhdpe?.ratePerKg), safeNumber(sup(1).rhdpe?.ratePerKg), safeNumber(sup(2).rhdpe?.ratePerKg), "", "", "", "", "", ""]);
  rows.push(["Material Quality Declaration Provided", sup(0).rhdpe?.materialQualityDeclarationProvided || "", sup(1).rhdpe?.materialQualityDeclarationProvided || "", sup(2).rhdpe?.materialQualityDeclarationProvided || "", "", "", "", "", "", ""]);

  rows.push(["─── COLOUR MASTERBATCH (Blue/Grey) ───", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Rate per kg (₹)", safeNumber(sup(0).colourMasterbatch?.ratePerKg), safeNumber(sup(1).colourMasterbatch?.ratePerKg), safeNumber(sup(2).colourMasterbatch?.ratePerKg), "", "", "", "", "", ""]);
  rows.push(["TDS Provided", sup(0).colourMasterbatch?.tdsProvided || "", sup(1).colourMasterbatch?.tdsProvided || "", sup(2).colourMasterbatch?.tdsProvided || "", "", "", "", "", "", ""]);

  rows.push(["─── UV MASTERBATCH ───", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Rate per kg (₹)", safeNumber(sup(0).uvMasterbatch?.ratePerKg), safeNumber(sup(1).uvMasterbatch?.ratePerKg), safeNumber(sup(2).uvMasterbatch?.ratePerKg), "", "", "", "", "", ""]);
  rows.push(["TDS Provided", sup(0).uvMasterbatch?.tdsProvided || "", sup(1).uvMasterbatch?.tdsProvided || "", sup(2).uvMasterbatch?.tdsProvided || "", "", "", "", "", "", ""]);

  rows.push(["─── GENERAL ───", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Payment Terms", sup(0).general?.paymentTerms || "", sup(1).general?.paymentTerms || "", sup(2).general?.paymentTerms || "", "", "", "", "", "", ""]);
  rows.push(["Delivery Timeline", sup(0).general?.deliveryTimeline || "", sup(1).general?.deliveryTimeline || "", sup(2).general?.deliveryTimeline || "", "", "", "", "", "", ""]);
  rows.push(["Minimum Order Quantity", sup(0).general?.minimumOrderQuantity || "", sup(1).general?.minimumOrderQuantity || "", sup(2).general?.minimumOrderQuantity || "", "", "", "", "", "", ""]);
  rows.push(["Discount / Special Offer", sup(0).general?.discountSpecialOffer || "", sup(1).general?.discountSpecialOffer || "", sup(2).general?.discountSpecialOffer || "", "", "", "", "", "", ""]);
  rows.push(["Remarks", sup(0).general?.remarks || "", sup(1).general?.remarks || "", sup(2).general?.remarks || "", "", "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["C. L1 Supplier Selection (Lowest Qualified Rate)", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Selected Supplier (L1)", s3.selectedSupplierL1 || "", "", "", "L1 Overall Rate (₹/kg)", s3.l1OverallRate || "", "", "", "", ""]);
  rows.push(["Reason for Selection", s3.reasonForSelection || "", "", "", "Est. Total Order Value (₹)", s3.estTotalOrderValue || "", "", "", "", ""]);
  const dv = s3.documentsVerified || {};
  rows.push(["Documents Verified?", `COA:${dv.coa ? "Yes" : "No"} MSDS:${dv.msds ? "Yes" : "No"} Mfg Cert:${dv.mfgCert ? "Yes" : "No"} MQD:${dv.materialQualityDecl ? "Yes" : "No"} TDS(CM):${dv.tdsCm ? "Yes" : "No"} TDS(UV):${dv.tdsUv ? "Yes" : "No"}`, "", "", "", "", "", "", "", ""]);
  rows.push(["Declaration", s3.declaration || "", "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["Step", "Action / Task", "", "", "Responsible Person", "", "Date / Time", "", "", "Status"]);
  const log = s3.actionLog || [];
  const defaultLog = [
    ["Quotations collected (min 2–3 per RM type)", "Purchase Officer"],
    ["Document checklist verified for L1 supplier", "Purchase Officer"],
    ["Sent to Pricing Team for validation", "Purchase Officer"],
  ];
  for (let i = 0; i < 3; i++) {
    const l = log[i] || {};
    rows.push([i + 1, l.actionTask || defaultLog[i]?.[0] || "", "", "", l.responsiblePerson || defaultLog[i]?.[1] || "", "", fmtDate(l.dateTime), "", "", l.status || ""]);
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage4Sheet(d) {
  const s4 = d.stage4 || {};
  const rows = [
    ["PRICING TEAM VALIDATION – RAW MATERIAL RATES", "", "", "", "", "", "", "", "", ""],
    ["Pricing / Costing Team", "Market Rate Cross-Check Before Finance Approval", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 4 of 8  –  Pricing Team validates L1 rates against market benchmarks → Signs off to Finance Manager", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["A. Reference Details", "", "", "", "", "", "", "", "", ""],
    ["PR Number", s4.prNumber || d.prNumber || "", "", "", "Date Received from PO", fmtDate(s4.dateReceivedFromPo), "", "", "", ""],
    ["Selected Supplier (L1)", s4.selectedSupplierL1 || "", "", "", "Total Order Value (₹)", s4.totalOrderValue || "", "", "", "", ""],
    ["Pricing Team Member", s4.pricingTeamMember || "", "", "", "Validation Date", fmtDate(s4.validationDate), "", "", "", ""],
    emptyRow(10),
    ["B. Rate Validation Table", "", "", "", "", "", "", "", "", ""],
    ["RM Type", "L1 Quoted Rate (₹/kg)", "Market Rate / Last PO Rate (₹/kg)", "Variance (%)", "Acceptable?", "Remarks", "", "", "", ""],
  ];

  const validations = s4.rateValidations || [];
  const defaultRvs = [
    "Virgin HDPE Granule (ICOL-180M50)",
    "rHDPE Granule (Blue / Grey)",
    "Colour Masterbatch (Blue / Grey)",
    "UV Masterbatch",
  ];
  const startRow = rows.length + 1;
  defaultRvs.forEach((rmType, i) => {
    const rv = validations[i] || {};
    rows.push([
      rv.rmType || rmType,
      safeNumber(rv.l1QuotedRate),
      safeNumber(rv.marketRate),
      { f: 'IF(AND(B' + (startRow + i) + '>0,C' + (startRow + i) + '>0),(B' + (startRow + i) + '-C' + (startRow + i) + ')/C' + (startRow + i) + '*100,"")' },
      rv.acceptable || "",
      rv.remarks || "",
      "",
      "",
      "",
      "",
    ]);
  });

  rows.push(emptyRow(10));
  rows.push(["C. Overall Validation Checklist", "", "", "", "", "", "", "", "", ""]);
  const cl = s4.overallChecklist || {};
  rows.push(["1. Rates compared against last 3 purchase orders (if available)", "", "", "", "", "", "", cl.last3PoRatesCompared || "", "", ""]);
  rows.push(["2. Market benchmark / index price verified", "", "", "", "", "", "", cl.marketBenchmarkVerified || "", "", ""]);
  rows.push(["3. All required RM documents (COA, TDS, MQD) are attached and verified", "", "", "", "", "", "", cl.rmDocumentsAttachedVerified || "", "", ""]);
  rows.push(["4. Supplier GST and credentials checked", "", "", "", "", "", "", cl.supplierGstCredentialsChecked || "", "", ""]);
  rows.push(["5. No abnormal deviation (>10%) in quoted price without valid justification", "", "", "", "", "", "", cl.noAbnormalDeviation || "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["D. Pricing Team Decision", "", "", "", "", "", "", "", "", ""]);
  const dec = s4.decision || {};
  rows.push(["Validation Result", dec.validationResult || "", "", "VALIDATED – Forward to Finance Manager / QUERY RAISED – Clarification needed from PO", "", "", "", "", "", ""]);
  rows.push(["Remarks / Conditions", dec.remarks || "", "", "", "", "", "", "", "", ""]);
  rows.push(["Validated By (Name)", dec.validatedBy || "", "", "", "Signature / Date", fmtDate(dec.signatureDate), "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["Step", "Action / Task", "", "", "Responsible Person", "", "Date / Time", "", "", "Status"]);
  const log = s4.actionLog || [];
  const defaultLog = [
    ["Rate validation completed against market benchmark", "Pricing Team"],
    ["Document checklist confirmed", "Pricing Team"],
    ["Forwarded to Finance Manager for approval", "Pricing Team"],
  ];
  for (let i = 0; i < 3; i++) {
    const l = log[i] || {};
    rows.push([i + 1, l.actionTask || defaultLog[i]?.[0] || "", "", "", l.responsiblePerson || defaultLog[i]?.[1] || "", "", fmtDate(l.dateTime), "", "", l.status || ""]);
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage5Sheet(d) {
  const s5 = d.stage5 || {};
  const rows = [
    ["FINANCE MANAGER APPROVAL", "", "", "", "", "", "", "", "", ""],
    ["Final Purchase Authorization", "Finance Department", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 5 of 8  –  Finance Manager reviews pricing-validated quotation → APPROVE / REJECT → Accounting", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["A. Reference Details", "", "", "", "", "", "", "", "", ""],
    ["PR Number", s5.prNumber || d.prNumber || "", "", "", "Pricing Validation Date", fmtDate(s5.pricingValidationDate), "", "", "", ""],
    ["Selected Supplier (L1)", s5.selectedSupplierL1 || "", "", "", "Total Order Value (₹)", s5.totalOrderValue || "", "", "", "", ""],
    ["Purchase Officer Name", s5.purchaseOfficerName || "", "", "", "Date Received by Finance", fmtDate(s5.dateReceivedByFinance), "", "", "", ""],
    emptyRow(10),
    ["B. Finance Review Checklist", "", "", "", "", "", "", "", "", ""],
  ];

  const cl = s5.reviewChecklist || {};
  rows.push(["1. Budget available for this raw material purchase", "", "", "", "", "", "", cl.budgetAvailable || "", "", ""]);
  rows.push(["2. Pricing Team validation is attached and signed off", "", "", "", "", "", "", cl.pricingValidationAttached || "", "", ""]);
  rows.push(["3. L1 supplier rate is within approved budget / benchmark", "", "", "", "", "", "", cl.l1RateWithinBudget || "", "", ""]);
  rows.push(["4. Supplier GST number verified", "", "", "", "", "", "", cl.supplierGstVerified || "", "", ""]);
  rows.push(["5. Payment terms are acceptable", "", "", "", "", "", "", cl.paymentTermsAcceptable || "", "", ""]);
  rows.push(["6. Supporting documents (PR, Quotation Sheet, Pricing Validation) are complete", "", "", "", "", "", "", cl.supportingDocumentsComplete || "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["C. Finance Manager Decision", "", "", "", "", "", "", "", "", ""]);
  const dec = s5.decision || {};
  rows.push(["Decision", dec.decision || "", "", "APPROVED – Proceed to Payment / REJECTED – Reason below / On Hold – Clarification needed", "", "", "", "", "", ""]);
  rows.push(["Remarks / Rejection Reason", dec.remarksRejectionReason || "", "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["D. Finance Manager Sign-Off", "", "", "", "", "", "", "", "", ""]);
  const so = s5.signOff || {};
  rows.push(["Finance Manager Name", so.financeManagerName || "", "", "", "Date of Approval", fmtDate(so.dateOfApproval), "", "", "", ""]);
  rows.push(["Signature / Digital Approval Ref", so.signatureDigitalApprovalRef || "", "", "", "Time of Approval", so.timeOfApproval || "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["Step", "Action / Task", "", "", "Responsible Person", "", "Date / Time", "", "", "Status"]);
  const log = s5.actionLog || [];
  const defaultLog = [
    ["Finance review checklist completed", "Finance Manager"],
    ["Purchase APPROVED / REJECTED decision recorded", "Finance Manager"],
    ["Forwarded to Accounting Team for payment processing", "Finance Manager"],
  ];
  for (let i = 0; i < 3; i++) {
    const l = log[i] || {};
    rows.push([i + 1, l.actionTask || defaultLog[i]?.[0] || "", "", "", l.responsiblePerson || defaultLog[i]?.[1] || "", "", fmtDate(l.dateTime), "", "", l.status || ""]);
  }
  rows.push(["Upon approval, Accounting Team receives this form along with supplier bank details.", "", "", "", "", "", "", "", "", ""]);

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage6Sheet(d) {
  const s6 = d.stage6 || {};
  const rows = [
    ["PAYMENT PROCESSING & UTR CONFIRMATION", "", "", "", "", "", "", "", "", ""],
    ["Accounting Team", "Supplier Payment Workflow", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 6 of 8  –  Accounting processes payment → Confirms UTR → Intimates Purchase Officer", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["A. Reference Details", "", "", "", "", "", "", "", "", ""],
    ["PR Number", s6.prNumber || d.prNumber || "", "", "", "Finance Approval Date", fmtDate(s6.financeApprovalDate), "", "", "", ""],
    ["Supplier Name", s6.supplierName || "", "", "", "Total Payment Amount (₹)", s6.totalPaymentAmount || "", "", "", "", ""],
    emptyRow(10),
    ["B. Supplier Bank Details", "", "", "", "", "", "", "", "", ""],
  ];

  const bank = s6.supplierBankDetails || {};
  rows.push(["Account Name", bank.accountName || "", "", "", "Bank Name", bank.bankName || "", "", "", "", ""]);
  rows.push(["Account Number", bank.accountNumber || "", "", "", "IFSC Code", bank.ifscCode || "", "", "", "", ""]);
  rows.push(["Account Type", bank.accountType || "", "", "", "Branch", bank.branch || "", "", "", "", ""]);
  rows.push(["UPI / VPA (if applicable)", bank.upiVpa || "", "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["C. Payment Details", "", "", "", "", "", "", "", "", ""]);
  const pay = s6.paymentDetails || {};
  rows.push(["Payment Method", pay.paymentMethod || "", "", "NEFT / RTGS / IMPS / Cheque / UPI", "Payment Date", fmtDate(pay.paymentDate), "", "", "", ""]);
  rows.push(["Amount Paid (₹)", pay.amountPaid || "", "", "", "UTR / Transaction Reference No.", pay.utrReferenceNo || "", "", "", "", ""]);
  rows.push(["Bank / Platform Used", pay.bankPlatformUsed || "", "", "", "Time of Transfer", pay.timeOfTransfer || "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["D. Accounting Team Sign-Off", "", "", "", "", "", "", "", "", ""]);
  const aso = s6.accountingSignOff || {};
  rows.push(["Processed By (Name)", aso.processedByName || "", "", "", "Designation", aso.designation || "", "", "", "", ""]);
  rows.push(["Signature / Approval Ref", aso.signatureApprovalRef || "", "", "", "Date Confirmed", fmtDate(aso.dateConfirmed), "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["E. UTR Intimation to Purchase Officer", "", "", "", "", "", "", "", "", ""]);
  const utr = s6.utrIntimation || {};
  rows.push(["UTR Shared With Purchase Officer On", fmtDate(utr.utrSharedWithPurchaseOfficerOn), "", "", "Mode of Sharing", utr.modeOfSharing || "", "", "", "", ""]);
  rows.push(["Once UTR is shared, Purchase Officer is authorised to contact supplier and proceed with order placement.", "", "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["Step", "Action / Task", "", "", "Responsible Person", "", "Date / Time", "", "", "Status"]);
  const log = s6.actionLog || [];
  const defaultLog = [
    ["Payment processed and UTR recorded", "Accounting Team"],
    ["Payment confirmation intimated to Purchase Officer", "Accounting Team"],
    ["Purchase Officer authorised to place RM order", "System / Accounting"],
  ];
  for (let i = 0; i < 3; i++) {
    const l = log[i] || {};
    rows.push([i + 1, l.actionTask || defaultLog[i]?.[0] || "", "", "", l.responsiblePerson || defaultLog[i]?.[1] || "", "", fmtDate(l.dateTime), "", "", l.status || ""]);
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage7Sheet(d) {
  const s7 = d.stage7 || {};
  const rows = [
    ["ORDER PLACEMENT & DISPATCH TRACKING", "", "", "", "", "", "", "", "", ""],
    ["Purchase Officer", "Supplier Follow-Up & Logistics Update", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 7 of 8  –  PO places order after payment → Follows up → Updates dispatch details on arrival", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["A. Order Reference", "", "", "", "", "", "", "", "", ""],
    ["PR Number", s7.prNumber || d.prNumber || "", "", "", "UTR / Payment Reference", s7.utrPaymentReference || "", "", "", "", ""],
    ["Supplier Name", s7.supplierName || "", "", "", "Supplier Contact No.", s7.supplierContactNo || "", "", "", "", ""],
    ["Order Placed By (PO Name)", s7.orderPlacedBy || "", "", "", "Order Placed Date", fmtDate(s7.orderPlacedDate), "", "", "", ""],
    ["Supplier Order Confirmation Ref.", s7.supplierOrderConfirmationRef || "", "", "", "Confirmation Mode", s7.confirmationMode || "", "", "", "", ""],
    emptyRow(10),
    ["B. Delivery Timeline Follow-Up Log", "", "", "", "", "", "", "", "", ""],
    ["Date", "Follow-Up Mode", "Person Spoken To", "Supplier Update / Commitment", "Next Follow-Up Date", "", "", "", "", ""],
  ];

  const followUps = s7.followUpLog || [];
  for (let i = 0; i < 5; i++) {
    const f = followUps[i] || {};
    rows.push([fmtDate(f.date), f.followUpMode || "", f.personSpokenTo || "", f.supplierUpdateCommitment || "", fmtDate(f.nextFollowUpDate), "", "", "", "", ""]);
  }

  rows.push(emptyRow(10));
  rows.push(["C. Dispatch Details (Updated once supplier dispatches material)", "", "", "", "", "", "", "", "", ""]);
  const dd = s7.dispatchDetails || {};
  rows.push(["Dispatch Date", fmtDate(dd.dispatchDate), "", "", "Expected Delivery Date", fmtDate(dd.expectedDeliveryDate), "", "", "", ""]);
  rows.push(["Pick-Up / Loading Location", dd.pickUpLoadingLocation || "", "", "", "Delivery Location (Factory/Store)", dd.deliveryLocation || "", "", "", "", ""]);
  rows.push(["LR Number (Lorry Receipt)", dd.lrNumber || "", "", "", "DC Number (Delivery Challan)", dd.dcNumber || "", "", "", "", ""]);
  rows.push(["Invoice Number", dd.invoiceNumber || "", "", "", "Invoice Amount (₹)", dd.invoiceAmount || "", "", "", "", ""]);
  rows.push(["Transport Company Name", dd.transportCompanyName || "", "", "", "Transporter Contact No.", dd.transporterContactNo || "", "", "", "", ""]);
  rows.push(["Driver Name", dd.driverName || "", "", "", "Driver Contact Number", dd.driverContactNumber || "", "", "", "", ""]);
  rows.push(["Vehicle Number", dd.vehicleNumber || "", "", "", "No. of Bags / Packages Dispatched", dd.noOfBagsPackagesDispatched || "", "", "", "", ""]);
  rows.push(["Total Weight Dispatched (kg)", dd.totalWeightDispatchedKg || "", "", "", "Material Tracking / e-Way Bill No.", dd.materialTrackingEWayBillNo || "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["D. RM-wise Dispatch Breakdown", "", "", "", "", "", "", "", "", ""]);
  rows.push(["RM Type", "Grade / Specification", "Qty Dispatched (kg)", "No. of Bags", "Batch No.", "Remarks", "", "", "", ""]);
  const breakdown = s7.rmDispatchBreakdown || [];
  const defaultBreakdown = [
    ["Virgin HDPE Granule", "ICOL-180M50"],
    ["rHDPE Granule", "Blue / Grey"],
    ["Colour Masterbatch", "Blue / Grey"],
    ["UV Masterbatch", "Standard UV"],
  ];
  defaultBreakdown.forEach(([rmType, grade], i) => {
    const b = breakdown[i] || {};
    rows.push([b.rmType || rmType, b.grade || grade, safeNumber(b.qtyDispatchedKg), b.noOfBags || "", b.batchNo || "", b.remarks || "", "", "", "", ""]);
  });

  rows.push(emptyRow(10));
  rows.push(["E. Next Step: QC / Store Manager to Raise GRN on Receipt", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Once material arrives at factory/store, QC / Store Manager will inspect and raise GRN (Sheet 8). PR will be marked CLOSED.", "", "", "", "", "", "", "", "", ""]);

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage8Sheet(d) {
  const s8 = d.stage8 || {};
  const rows = [
    ["RAW MATERIAL GOODS RECEIVED NOTE (RM-GRN)", "", "", "", "", "", "", "", "", ""],
    ["QC / Store Manager", "Raised on RM Receipt at Factory Store", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["● STAGE 8 of 8  –  QC / Store inspects RM → Raises GRN → Intimates Purchase Officer → PR CLOSED", "", "", "", "", "", "", "", "", ""],
    emptyRow(10),
    ["1. Reference & Delivery Information", "", "", "", "", "", "", "", "", ""],
    ["GRN Number", s8.grnNumber || "", "", "GRN-RM-2025-___", "Date of Receipt", fmtDate(s8.dateOfReceipt), "", "", "", ""],
    ["PR Number (Reference)", s8.prNumber || d.prNumber || "", "", "", "PO / Order Reference No.", s8.poOrderReferenceNo || "", "", "", "", ""],
    ["Supplier Name", s8.supplierName || "", "", "", "Supplier Contact No.", s8.supplierContactNo || "", "", "", "", ""],
    ["LR / DC Number", s8.lrDcNumber || "", "", "", "Invoice Number", s8.invoiceNumber || "", "", "", "", ""],
    ["Vehicle Number", s8.vehicleNumber || "", "", "", "No. of Bags / Packages Received", s8.noOfBagsPackagesReceived || "", "", "", "", ""],
    emptyRow(10),
    ["2. RM Receipt & Inspection Table", "", "", "", "", "", "", "", "", ""],
    ["RM Type", "Grade / Specification", "Ordered Qty (kg)", "Received Qty (kg)", "Shortage / Excess (kg)", "Physical Condition", "Documents Received", "Accepted / Rejected", "Batch / Lot No.", ""],
  ];

  const inspections = s8.rmReceiptInspection || [];
  const defaultInspections = [
    ["Virgin HDPE Granule", "ICOL-180M50"],
    ["rHDPE Granule", "Blue / Grey"],
    ["Colour Masterbatch", "Blue / Grey"],
    ["UV Masterbatch", "Standard UV"],
  ];
  const startRow = rows.length + 1;
  defaultInspections.forEach(([rmType, grade], i) => {
    const insp = inspections[i] || {};
    rows.push([
      insp.rmType || rmType,
      insp.grade || grade,
      safeNumber(insp.orderedQty),
      safeNumber(insp.receivedQty),
      { f: 'D' + (startRow + i) + '-C' + (startRow + i) },
      insp.physicalCondition || "",
      `COA:${insp.documentsReceived?.coa ? "Yes" : "No"} TDS:${insp.documentsReceived?.tds ? "Yes" : "No"} MQD:${insp.documentsReceived?.mqd ? "Yes" : "No"}`,
      insp.acceptedRejected || "",
      insp.batchLotNo || "",
      "",
    ]);
  });

  rows.push(emptyRow(10));
  rows.push(["3. Document Verification Checklist", "", "", "", "", "", "", "", "", ""]);
  const cl = s8.documentChecklist || {};
  rows.push(["1. Virgin HDPE Granule – Certificate of Analysis (COA) received & verified", "", "", "", "", "", "", cl.virginHdpeCoa || "", "", ""]);
  rows.push(["2. Virgin HDPE Granule – MSDS (Material Safety Data Sheet) received", "", "", "", "", "", "", cl.virginHdpeMsds || "", "", ""]);
  rows.push(["3. Virgin HDPE Granule – Manufacturer's Certificate received", "", "", "", "", "", "", cl.virginHdpeMfgCert || "", "", ""]);
  rows.push(["4. Virgin HDPE Granule – Test Report matches PO specification", "", "", "", "", "", "", cl.virginHdpeTestReport || "", "", ""]);
  rows.push(["5. rHDPE Granule – Material Quality Declaration received & verified", "", "", "", "", "", "", cl.rhdpeMqd || "", "", ""]);
  rows.push(["6. Colour Masterbatch – Technical Data Sheet (TDS) received", "", "", "", "", "", "", cl.colourMasterbatchTds || "", "", ""]);
  rows.push(["7. UV Masterbatch – Technical Data Sheet (TDS) received", "", "", "", "", "", "", cl.uvMasterbatchTds || "", "", ""]);
  rows.push(["8. Invoice matches PO quantity and rate", "", "", "", "", "", "", cl.invoiceMatchesPo || "", "", ""]);
  rows.push(["9. e-Way Bill received (if applicable)", "", "", "", "", "", "", cl.eWayBillReceived || "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["4. Quality Inspection Notes", "", "", "", "", "", "", "", "", ""]);
  rows.push([s8.qualityInspectionNotes || "", "", "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["5. Return / Rejection Note (if any)", "", "", "", "", "", "", "", "", ""]);
  const rr = s8.returnRejectionNote || {};
  rows.push(["RM to be Returned / Rejected", rr.rmToBeReturnedRejected || "", "Mention RM type, qty, and reason", "", "", "", "", "", "", ""]);
  rows.push(["Action Taken / Supplier Notified On", fmtDate(rr.actionTakenSupplierNotifiedOn), "", "", "Credit / Replacement Expected By", fmtDate(rr.creditReplacementExpectedBy), "", "", "", ""]);

  rows.push(emptyRow(10));
  rows.push(["6. GRN Approvals & PR Closure", "", "", "", "", "", "", "", "", ""]);
  rows.push(["Role", "", "Name", "", "Signature", "", "Date", "", "Status", ""]);
  const approvals = s8.approvals || [];
  const defaultApprovals = [
    "Received & Inspected By (QC / Store Manager)",
    "GRN Verified By (Production Head)",
    "PR Closed By (Purchase Officer)",
  ];
  defaultApprovals.forEach((role, i) => {
    const a = approvals[i] || {};
    rows.push([role, "", a.name || "", "", a.signature || "", "", fmtDate(a.date), "", a.status || "", ""]);
  });
  rows.push(["Once GRN is submitted and all approvals done, the Purchase Officer marks this PR as CLOSED in the system. RM is added to inventory.", "", "", "", "", "", "", "", "", ""]);

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildWorkbook(d) {
  const data = computeDoc(d);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildStage1Sheet(data), "1. Sales Order & RM Estimate");
  XLSX.utils.book_append_sheet(wb, buildStage2Sheet(data), "2. Purchase Request");
  XLSX.utils.book_append_sheet(wb, buildStage3Sheet(data), "3. Supplier Quotation");
  XLSX.utils.book_append_sheet(wb, buildStage4Sheet(data), "4. Pricing Validation");
  XLSX.utils.book_append_sheet(wb, buildStage5Sheet(data), "5. Finance Approval");
  XLSX.utils.book_append_sheet(wb, buildStage6Sheet(data), "6. Payment & UTR");
  XLSX.utils.book_append_sheet(wb, buildStage7Sheet(data), "7. Order & Dispatch");
  XLSX.utils.book_append_sheet(wb, buildStage8Sheet(data), "8. RM Goods Received Note");
  return wb;
}

// Export single PR to Excel
router.get("/rm-procurement/:id/export", authMiddleware, async (req, res) => {
  try {
    const doc = await RmProcurementSop.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "PR not found" });
    }
    const wb = buildWorkbook(doc);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `RM_Procurement_${doc.prNumber || doc._id}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    logger.error("Error exporting RM Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download blank template
router.get("/rm-procurement/template/download", authMiddleware, async (req, res) => {
  try {
    const wb = buildWorkbook({
      prNumber: "",
      stage1: {},
      stage2: {},
      stage3: {},
      stage4: {},
      stage5: {},
      stage6: {},
      stage7: {},
      stage8: {},
    });
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename="RM_Procurement_SOP_Template.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    logger.error("Error downloading RM Procurement template:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

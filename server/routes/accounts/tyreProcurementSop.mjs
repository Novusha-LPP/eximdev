import express from "express";
import XLSX from "xlsx";
import TyreProcurementSop from "../../model/accounts/tyreProcurementSop.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();

// ─── Helpers ───
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

function computeDoc(doc) {
  const clone = JSON.parse(JSON.stringify(doc));

  // Compute estTotal for Stage 1 items
  let estTotalCost = 0;
  clone.stage1?.itemsRequired?.forEach((item) => {
    item.estTotal = (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
    estTotalCost += item.estTotal;
  });
  if (clone.stage1) {
    clone.stage1.estimatedTotalCost = estTotalCost;
  }

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

// List Tyre PRs
router.get("/tyre-procurement", authMiddleware, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { prNumber: regex },
        { poNumber: regex },
        { "stage1.preparedBy": regex },
        { "stage2.selectedSupplierL1": regex },
        { "stage4.supplierName": regex },
        { "stage6.supplierName": regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      TyreProcurementSop.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TyreProcurementSop.countDocuments(query),
    ]);

    const data = items.map(computeDoc);
    res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    logger.error("Error listing Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single Tyre PR
router.get("/tyre-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await TyreProcurementSop.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    res.json({ success: true, data: computeDoc(doc) });
  } catch (error) {
    logger.error("Error fetching Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Tyre PR
router.post("/tyre-procurement", authMiddleware, async (req, res) => {
  try {
    const { prNumber } = req.body;
    if (!prNumber?.trim()) {
      return res.status(400).json({ success: false, message: "PR Number is required" });
    }
    const existing = await TyreProcurementSop.findOne({ prNumber: prNumber.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "PR Number already exists" });
    }
    const doc = new TyreProcurementSop(req.body);
    await doc.save();
    res.status(201).json({ success: true, data: computeDoc(doc.toObject()) });
  } catch (error) {
    logger.error("Error creating Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Tyre PR
router.put("/tyre-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const { prNumber } = req.body;
    const existing = await TyreProcurementSop.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    if (prNumber && prNumber.trim() !== existing.prNumber) {
      const duplicate = await TyreProcurementSop.findOne({ prNumber: prNumber.trim() });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "PR Number already exists" });
      }
    }
    const doc = await TyreProcurementSop.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();
    res.json({ success: true, data: computeDoc(doc) });
  } catch (error) {
    logger.error("Error updating Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Tyre PR
router.delete("/tyre-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await TyreProcurementSop.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    res.json({ success: true, message: "Tyre PR deleted successfully" });
  } catch (error) {
    logger.error("Error deleting Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Excel Export Generators ───

function buildStage1Sheet(d) {
  const s1 = d.stage1 || {};
  const rows = [
    ["PURCHASE REQUEST ORDER – TYRES (SRCC)", "", "", "", "", "", "", ""],
    ["New & Remould Tyres for Trailer Trucks  |  Tyre SOP", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 1 of 6  –  Operations/Fleet Team  →  HoD Validation  →  Purchase Officer", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Purchase Request Identity", "", "", "", "", "", "", ""],
    ["PR Number", s1.prNumber || d.prNumber || "", "", "TT-TYRE-2025-___", "PR Date", fmtDate(s1.prDate), "", ""],
    ["Prepared By (Name)", s1.preparedBy || "", "", "", "Contact Number", s1.contactNumber || "", "", ""],
    ["Department / Location", s1.departmentLocation || "", "", "", "Needed By Date", fmtDate(s1.neededByDate), "", ""],
    emptyRow(8),
    ["B. HoD Validation", "", "", "", "", "", "", ""],
    ["Validated By (HoD Name)", s1.hodValidation?.validatedBy || "", "", "", "Designation", s1.hodValidation?.designation || "", "", ""],
    ["Approval Mode", s1.hodValidation?.approvalMode || "", "", "WhatsApp / Phone Call / Email / In-Person", "", "", "", ""],
    ["Date & Time of Approval", fmtDate(s1.hodValidation?.dateTimeOfApproval), "", "", "HoD Signature / Initials", s1.hodValidation?.hodSignature || "", "", ""],
    emptyRow(8),
    ["C. Items Required", "", "", "", "", "", "", ""],
    ["Tyre Type", "Brand Preference", "Size / Spec", "Load Rating", "Rim Size", "Qty", "Est. Unit Cost (₹)", "Est. Total (₹)"],
  ];

  const items = s1.itemsRequired || [];
  const defaultItems = [
    ["New Tyre"],
    ["New Tyre"],
    ["Remould Tyre"],
    ["Remould Tyre"],
    ["Remould Tyre"],
  ];

  defaultItems.forEach((def, i) => {
    const item = items[i] || {};
    const type = item.tyreType || def[0];
    const qty = safeNumber(item.qty);
    const cost = safeNumber(item.estUnitCost);
    rows.push([
      type,
      item.brandPreference || "",
      item.sizeSpec || "",
      item.loadRating || "",
      item.rimSize || "",
      qty,
      cost,
      { f: `F${rows.length + 1}*G${rows.length + 1}` },
    ]);
  });

  const totalRowIndex = rows.length + 1;
  rows.push(["ESTIMATED TOTAL COST (₹)", "", "", "", "", "", "", { f: `SUM(H${totalRowIndex - 5}:H${totalRowIndex - 1})` }]);

  rows.push(emptyRow(8));
  rows.push(["D. Specification & Supplier Preference", "", "", "", "", "", "", ""]);
  rows.push(["Specification Details", s1.specificationDetails || "", "", "Brand, Load Rating, Rim Size, Remould Spec, etc.", "", "", "", ""]);
  rows.push(["Preferred Supplier (if any)", s1.preferredSupplier || "", "", "", "Supplier Contact", s1.supplierContact || "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["E. Current Stock Status", "", "", "", "", "", "", ""]);
  rows.push(["Current Stock – New Tyres", s1.currentStockNew || 0, "", "", "Current Stock – Used/Remould", s1.currentStockUsedRemould || 0, "", ""]);

  rows.push(emptyRow(8));
  rows.push(["F. Comments / Additional Information", "", "", "", "", "", "", ""]);
  rows.push([s1.comments || "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["G. Routing Checklist", "", "", "", "", "", "", ""]);
  rows.push(["Step", "Action", "", "", "Responsible", "", "Date", "Status"]);
  const checklist = s1.routingChecklist || [];
  const defaultChecklist = [
    ["Step 1", "PR Raised by Requester", "Operations Team"],
    ["Step 2", "Validated by HoD", "Head of Department"],
    ["Step 3", "Forwarded to Purchase Officer", "Purchase Officer"],
  ];
  defaultChecklist.forEach((chk, i) => {
    const val = checklist[i] || {};
    rows.push([chk[0], val.action || chk[1], "", "", val.responsible || chk[2], "", fmtDate(val.date), val.status || ""]);
  });

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage2Sheet(d) {
  const s2 = d.stage2 || {};
  const rows = [
    ["SUPPLIER QUOTATION COMPARISON SHEET", "", "", "", "", "", "", ""],
    ["Tyre Purchase – Comparative Statement  |  Purchase Officer Use Only", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 2 of 6  –  Purchase Officer collects 3 quotes → Selects L1 → Sends to Finance Manager", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Reference Details", "", "", "", "", "", "", ""],
    ["PR Number", s2.prNumber || d.prNumber || "", "", "", "PO Number", s2.poNumber || d.poNumber || "", "", ""],
    ["Purchase Officer Name", s2.purchaseOfficerName || "", "", "", "PO Date", fmtDate(s2.poDate), "", ""],
    emptyRow(8),
    ["B. Supplier Details & Quotation", "", "", "", "", "", "", ""],
    ["Field", "Supplier 1", "Supplier 2", "Supplier 3", "", "", "", ""],
  ];

  const suppliers = s2.suppliers || [];
  const sup = (i) => suppliers[i] || {};

  rows.push(["Supplier Name", sup(0).supplierName || "", sup(1).supplierName || "", sup(2).supplierName || "", "", "", "", ""]);
  rows.push(["Contact Person", sup(0).contactPerson || "", sup(1).contactPerson || "", sup(2).contactPerson || "", "", "", "", ""]);
  rows.push(["Phone Number", sup(0).phoneNumber || "", sup(1).phoneNumber || "", sup(2).phoneNumber || "", "", "", "", ""]);
  rows.push(["Email / WhatsApp", sup(0).emailWhatsApp || "", sup(1).emailWhatsApp || "", sup(2).emailWhatsApp || "", "", "", "", ""]);
  rows.push(["GST Number", sup(0).gstNumber || "", sup(1).gstNumber || "", sup(2).gstNumber || "", "", "", "", ""]);
  rows.push(["Tyre Brand", sup(0).tyreBrand || "", sup(1).tyreBrand || "", sup(2).tyreBrand || "", "", "", "", ""]);
  rows.push(["Size & Specification", sup(0).sizeSpecification || "", sup(1).sizeSpecification || "", sup(2).sizeSpecification || "", "", "", "", ""]);
  rows.push(["Unit Price – New Tyre (₹)", safeNumber(sup(0).unitPriceNew), safeNumber(sup(1).unitPriceNew), safeNumber(sup(2).unitPriceNew), "", "", "", ""]);
  rows.push(["Unit Price – Remould Tyre (₹)", safeNumber(sup(0).unitPriceRemould), safeNumber(sup(1).unitPriceRemould), safeNumber(sup(2).unitPriceRemould), "", "", "", ""]);
  rows.push(["Qty Available", safeNumber(sup(0).qtyAvailable), safeNumber(sup(1).qtyAvailable), safeNumber(sup(2).qtyAvailable), "", "", "", ""]);
  rows.push(["Freight Charges", safeNumber(sup(0).freightCharges), safeNumber(sup(1).freightCharges), safeNumber(sup(2).freightCharges), "", "", "", ""]);
  rows.push(["Delivery Timeline", sup(0).deliveryTimeline || "", sup(1).deliveryTimeline || "", sup(2).deliveryTimeline || "", "", "", "", ""]);
  rows.push(["Delivery Location", sup(0).deliveryLocation || "", sup(1).deliveryLocation || "", sup(2).deliveryLocation || "", "", "", "", ""]);
  rows.push(["Warranty / Guarantee", sup(0).warrantyGuarantee || "", sup(1).warrantyGuarantee || "", sup(2).warrantyGuarantee || "", "", "", "", ""]);
  rows.push(["Payment Terms : Adv / Days", sup(0).paymentTerms || "", sup(1).paymentTerms || "", sup(2).paymentTerms || "", "", "", "", ""]);
  rows.push(["Discount Offered", safeNumber(sup(0).discountOffered), safeNumber(sup(1).discountOffered), safeNumber(sup(2).discountOffered), "", "", "", ""]);
  rows.push(["Remarks", sup(0).remarks || "", sup(1).remarks || "", sup(2).remarks || "", "", "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["C. L1 Supplier Selection (Lowest Qualified Bidder)", "", "", "", "", "", "", ""]);
  rows.push(["Selected Supplier (L1)", s2.selectedSupplierL1 || "", "", "", "L1 Price Quoted (₹)", safeNumber(s2.l1PriceQuoted), "", ""]);
  rows.push(["Reason for Selection", s2.reasonForSelection || "", "", "", "Total Order Value (₹)", safeNumber(s2.totalOrderValue), "", ""]);
  rows.push(["Purchase Officer Declaration", s2.declaration || "I confirm the above comparison is accurate and L1 selected on best value.", "", "", "", "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["Step", "Action", "", "", "Responsible", "", "Date", "Status"]);
  const checklist = s2.routingChecklist || [];
  const defaultChecklist = [
    ["Step 1", "Quotations collected (min. 3)", "Purchase Officer"],
    ["Step 2", "L1 Supplier selected", "Purchase Officer"],
    ["Step 3", "Sent to Finance Manager for approval", "Purchase Officer"],
  ];
  defaultChecklist.forEach((chk, i) => {
    const val = checklist[i] || {};
    rows.push([chk[0], val.action || chk[1], "", "", val.responsible || chk[2], "", fmtDate(val.date), val.status || ""]);
  });

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage3Sheet(d) {
  const s3 = d.stage3 || {};
  const rows = [
    ["FINANCE MANAGER APPROVAL NOTE", "", "", "", "", "", "", ""],
    ["Tyre Purchase Order Authorization  |  Finance Department", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 3 of 6  –  Finance Manager reviews L1 quotation → Approves / Rejects → Forwards to Accounting", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Reference Information", "", "", "", "", "", "", ""],
    ["PO Number", s3.poNumber || d.poNumber || "", "", "", "PO Date", fmtDate(s3.poDate), "", ""],
    ["Selected Supplier (L1)", s3.selectedSupplierL1 || "", "", "", "Total Order Value (₹)", safeNumber(s3.totalOrderValue), "", ""],
    ["Purchase Officer Name", s3.purchaseOfficerName || "", "", "", "Date Received by Finance", fmtDate(s3.dateReceivedByFinance), "", ""],
    emptyRow(8),
    ["B. Finance Review Checklist", "", "", "", "", "", "", ""],
    ["1. Budget availability confirmed for this purchase", "", "", "", "", "", "", s3.reviewChecklist?.budgetAvailable || ""],
    ["2. L1 supplier price is reasonable and within market range", "", "", "", "", "", "", s3.reviewChecklist?.priceReasonable || ""],
    ["3. GST number of supplier verified", "", "", "", "", "", "", s3.reviewChecklist?.gstVerified || ""],
    ["4. Payment terms reviewed and accepted", "", "", "", "", "", "", s3.reviewChecklist?.paymentTermsAccepted || ""],
    ["5. Supporting documents (PR, Quotation Sheet) are attached", "", "", "", "", "", "", s3.reviewChecklist?.docsAttached || ""],
    emptyRow(8),
    ["C. Finance Manager Decision", "", "", "", "", "", "", ""],
    ["Decision", s3.decision?.decision || "", "", "APPROVED – Proceed with Payment / REJECTED – Reason below / On Hold", "", "", "", ""],
    ["Remarks / Rejection Reason", s3.decision?.remarksRejectionReason || "", "", "", "", "", "", ""],
    emptyRow(8),
    ["D. Finance Manager Sign-Off", "", "", "", "", "", "", ""],
    ["Finance Manager Name", s3.signOff?.financeManagerName || "", "", "", "Date of Approval", fmtDate(s3.signOff?.dateOfApproval), "", ""],
    ["Signature / Digital Approval Ref", s3.signOff?.signatureDigitalApprovalRef || "", "", "", "Time of Approval", s3.signOff?.timeOfApproval || "", "", ""],
    emptyRow(8),
    ["E. Next Step: Accounting Team for Payment", "", "", "", "", "", "", ""],
    ["Once approved, this form is forwarded to the Accounting Team with supplier bank details for payment processing.", "", "", "", "", "", "", ""],
  ];

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage4Sheet(d) {
  const s4 = d.stage4 || {};
  const rows = [
    ["PAYMENT PROCESSING & UTR CONFIRMATION", "", "", "", "", "", "", ""],
    ["Accounting Team  |  Tyre Purchase Workflow", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 4 of 6  –  Accounting processes payment → Records UTR → Shares UTR with Purchase Officer", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Reference Details", "", "", "", "", "", "", ""],
    ["PO Number & Date", s4.poNumberDate || "", "", "", "Finance Approval Date", fmtDate(s4.financeApprovalDate), "", ""],
    ["Supplier Name", s4.supplierName || "", "", "", "Total Payment Amount (₹)", safeNumber(s4.totalPaymentAmount), "", ""],
    emptyRow(8),
    ["B. Supplier Bank Details", "", "", "", "", "", "", ""],
    ["Account Name", s4.supplierBankDetails?.accountName || "", "", "", "Bank Name", s4.supplierBankDetails?.bankName || "", "", ""],
    ["Account Number", s4.supplierBankDetails?.accountNumber || "", "", "", "IFSC Code", s4.supplierBankDetails?.ifscCode || "", "", ""],
    ["Account Type", s4.supplierBankDetails?.accountType || "", "", "", "Branch", s4.supplierBankDetails?.branch || "", "", ""],
    ["UPI / VPA (if any)", s4.supplierBankDetails?.upiVpa || "", "", "", "", "", "", ""],
    emptyRow(8),
    ["C. Payment Details", "", "", "", "", "", "", ""],
    ["Payment Method", s4.paymentDetails?.paymentMethod || "", "", "NEFT / RTGS / IMPS / Cheque / UPI", "Payment Date", fmtDate(s4.paymentDetails?.paymentDate), "", ""],
    ["Amount Paid (₹)", safeNumber(s4.paymentDetails?.amountPaid), "", "", "Payment Reference / UTR No.", s4.paymentDetails?.paymentReferenceUtr || "", "", ""],
    ["Bank / App Used for Transfer", s4.paymentDetails?.bankAppUsed || "", "", "", "Time of Transfer", s4.paymentDetails?.timeOfTransfer || "", "", ""],
    emptyRow(8),
    ["D. Accounting Team Sign-Off", "", "", "", "", "", "", ""],
    ["Processed By (Name)", s4.accountingSignOff?.processedByName || "", "", "", "Designation", s4.accountingSignOff?.designation || "", "", ""],
    ["Signature / Approval Ref", s4.accountingSignOff?.signatureApprovalRef || "", "", "", "Date Confirmed", fmtDate(s4.accountingSignOff?.dateConfirmed), "", ""],
    emptyRow(8),
    ["E. UTR Sharing – Next Step: Purchase Officer Places Order", "", "", "", "", "", "", ""],
    ["UTR Shared with Purchase Officer on", fmtDate(s4.utrSharing?.utrSharedWithPoOn), "", "", "Mode of Sharing", s4.utrSharing?.modeOfSharing || "WhatsApp / Email / Call", "", ""],
  ];

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage5Sheet(d) {
  const s5 = d.stage5 || {};
  const rows = [
    ["ORDER PLACEMENT & DISPATCH TRACKING", "", "", "", "", "", "", ""],
    ["Purchase Officer  |  Supplier Coordination", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 5 of 6  –  Purchase Officer places order → Supplier dispatches → PO updates dispatch details", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Order Reference", "", "", "", "", "", "", ""],
    ["PR Number", s5.prNumber || d.prNumber || "", "", "", "PO Number (if applicable)", s5.poNumber || d.poNumber || "", "", ""],
    ["Supplier Name", s5.supplierName || "", "", "", "UTR Number (Payment Ref)", s5.utrNumber || "", "", ""],
    ["Order Placed By (PO Name)", s5.orderPlacedBy || "", "", "", "Order Placed Date", fmtDate(s5.orderPlacedDate), "", ""],
    ["Order Confirmation from Supplier", s5.orderConfirmation || "", "", "", "Mode of Confirmation", s5.modeOfConfirmation || "WhatsApp / Email / Call", "", ""],
    emptyRow(8),
    ["B. Dispatch Details (Updated by Purchase Officer once supplier dispatches)", "", "", "", "", "", "", ""],
    ["Dispatch Date", fmtDate(s5.dispatchDetails?.dispatchDate), "", "", "Expected Delivery Date", fmtDate(s5.dispatchDetails?.expectedDeliveryDate), "", ""],
    ["Vehicle Number", s5.dispatchDetails?.vehicleNumber || "", "", "", "Transporter Name", s5.dispatchDetails?.transporterName || "", "", ""],
    ["Driver Name", s5.dispatchDetails?.driverName || "", "", "", "Driver Contact Number", s5.dispatchDetails?.driverContactNumber || "", "", ""],
    ["DC Number (Delivery Challan)", s5.dispatchDetails?.dcNumber || "", "", "", "LR Number (Lorry Receipt)", s5.dispatchDetails?.lrNumber || "", "", ""],
    ["Invoice Number", s5.dispatchDetails?.invoiceNumber || "", "", "", "Invoice Amount (₹)", safeNumber(s5.dispatchDetails?.invoiceAmount), "", ""],
    ["Delivery Location / Site", s5.dispatchDetails?.deliveryLocationSite || "", "", "", "No. of Tyres Dispatched", safeNumber(s5.dispatchDetails?.noOfTyresDispatched), "", ""],
    emptyRow(8),
    ["C. Remarks / Tracking Notes", "", "", "", "", "", "", ""],
    [s5.remarks || "", "", "", "", "", "", "", ""],
  ];

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage6Sheet(d) {
  const s6 = d.stage6 || {};
  const rows = [
    ["GOODS RECEIVED NOTE (GRN) – TYRES", "", "", "", "", "", "", "", ""],
    ["New & Remould Tyres for Trailer Trucks  |  Raised by Site / Maintenance Team", "", "", "", "", "", "", "", ""],
    emptyRow(9),
    ["● STAGE 6 of 6  –  GRN raised by concerned person on goods receipt → Submitted to Purchase Officer", "", "", "", "", "", "", "", ""],
    emptyRow(9),
    ["1. Reference & Delivery Information", "", "", "", "", "", "", "", ""],
    ["GRN Series No.", s6.grnSeriesNo || "", "", "GRN-TT-2025-___", "Date of Receipt", fmtDate(s6.dateOfReceipt), "", "", ""],
    ["PR Number", s6.prNumber || d.prNumber || "", "", "", "PO Number", s6.poNumber || d.poNumber || "", "", "", ""],
    ["Supplier Name", s6.supplierName || "", "", "", "Supplier Contact No.", s6.supplierContactNo || "", "", "", ""],
    ["Delivery Note / DC No.", s6.deliveryNoteDcNo || "", "", "", "LR Number", s6.lrNumber || "", "", "", ""],
    ["Vehicle Number", s6.vehicleNumber || "", "", "", "Delivery Location", s6.deliveryLocation || "", "", "", ""],
    emptyRow(9),
    ["2. Items Received – Tyre-wise Entry", "", "", "", "", "", "", "", ""],
    ["S.No", "Tyre Number (Unique ID)", "Tyre Brand", "Size & Spec", "Type (New/Remould)", "Hot Stamp Done?", "Photo Taken?", "Accepted / Rejected", "Remarks / Discrepancy"],
  ];

  const items = s6.itemsReceived || [];
  for (let i = 0; i < 12; i++) {
    const item = items[i] || {};
    rows.push([
      i + 1,
      item.tyreNumber || "",
      item.tyreBrand || "",
      item.sizeSpec || "",
      item.type || "New",
      item.hotStampDone || "No",
      item.photoTaken || "No",
      item.acceptedRejected || "Accepted",
      item.remarks || "",
    ]);
  }

  rows.push(emptyRow(9));
  rows.push(["3. Quality & Conformance Check", "", "", "", "", "", "", "", ""]);
  rows.push(["1. Tyres verified against PR / PO specifications (size, brand, quantity)", "", "", "", "", "", "", s6.qualityConformanceCheck?.tyresVerified || "", ""]);
  rows.push(["2. Unique tyre numbers matched and recorded in register", "", "", "", "", "", "", s6.qualityConformanceCheck?.tyreNumbersMatched || "", ""]);
  rows.push(["3. Hot tyre stamping completed for all received tyres", "", "", "", "", "", "", s6.qualityConformanceCheck?.hotStampingCompleted || "", ""]);
  rows.push(["4. Photos taken and attached for each tyre", "", "", "", "", "", "", s6.qualityConformanceCheck?.photosTaken || "", ""]);
  rows.push(["5. Invoice verified – quantity and value match with PO", "", "", "", "", "", "", s6.qualityConformanceCheck?.invoiceVerified || "", ""]);
  rows.push(["6. Return clause reviewed – discrepancy noted for supplier action", "", "", "", "", "", "", s6.qualityConformanceCheck?.returnClauseReviewed || "", ""]);

  rows.push(emptyRow(9));
  rows.push(["4. Inspection Notes", "", "", "", "", "", "", "", ""]);
  rows.push([s6.inspectionNotes || "", "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(9));
  rows.push(["5. Approvals & Sign-Off", "", "", "", "", "", "", "", ""]);
  rows.push(["Role", "", "Name", "", "Date", "", "Signature / Initials", "", ""]);
  const approvals = s6.approvals || [];
  const defaultApprovals = [
    "Received By (Site Person)",
    "Validated by – Maintenance Manager",
    "Reviewed by – Purchase Officer",
  ];
  defaultApprovals.forEach((role, i) => {
    const app = approvals[i] || {};
    rows.push([role, "", app.name || "", "", fmtDate(app.date), "", app.signature || "", "", ""]);
  });

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildWorkbook(d) {
  const data = computeDoc(d);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildStage1Sheet(data), "1. Purchase Request");
  XLSX.utils.book_append_sheet(wb, buildStage2Sheet(data), "2. Supplier Quotation");
  XLSX.utils.book_append_sheet(wb, buildStage3Sheet(data), "3. Finance Approval");
  XLSX.utils.book_append_sheet(wb, buildStage4Sheet(data), "4. Payment & UTR");
  XLSX.utils.book_append_sheet(wb, buildStage5Sheet(data), "5. Order & Dispatch");
  XLSX.utils.book_append_sheet(wb, buildStage6Sheet(data), "6. Goods Received Note");
  return wb;
}

// Export single Tyre PR to Excel
router.get("/tyre-procurement/:id/export", authMiddleware, async (req, res) => {
  try {
    const doc = await TyreProcurementSop.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    const wb = buildWorkbook(doc);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `Tyre_Procurement_${doc.prNumber || doc._id}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    logger.error("Error exporting Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download blank template
router.get("/tyre-procurement/template/download", authMiddleware, async (req, res) => {
  try {
    const wb = buildWorkbook({
      prNumber: "",
      stage1: {},
      stage2: {},
      stage3: {},
      stage4: {},
      stage5: {},
      stage6: {},
    });
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename="Tyre_Procurement_SOP_Template.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    logger.error("Error downloading Tyre Procurement template:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

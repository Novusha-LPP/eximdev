import express from "express";
import mongoose from "mongoose";
import moment from "moment";
import multer from "multer";
import * as XLSX from "xlsx";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import TransportBranchInvoicingModel, { TRANSPORT_BRANCHES } from "../../model/invoicing/TransportBranchInvoicingModel.mjs";
import TransportSundryDebtorModel, { SUNDRY_DEBTOR_PARTICULARS } from "../../model/invoicing/TransportSundryDebtorModel.mjs";
import TransportDirectIncomeModel from "../../model/invoicing/TransportDirectIncomeModel.mjs";
import UserModel from "../../model/userModel.mjs";
import {
  generateDailyTemplateBuffer,
  generateSundryTemplateBuffer,
  generateDirectIncomeTemplateBuffer,
  generateMasterWorkbookBuffer
} from "../../services/invoicing/transportTemplateService.mjs";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Helper: Resolve target user scope
 * - Non-admin: strictly scoped to req.user._id
 * - Admin: scoped to requested userId or defaults to null (all) or Ayan
 */
const resolveUserScope = (req) => {
  const isAdmin = req.user?.role === "Admin";
  if (!isAdmin) {
    return {
      userId: req.user._id,
      username: req.user.username,
      isAdmin: false
    };
  }
  const requestedUserId = req.query.userId || req.body.userId;
  return {
    userId: requestedUserId ? new mongoose.Types.ObjectId(requestedUserId) : null,
    username: req.query.username || req.body.username || null,
    isAdmin: true
  };
};

/**
 * Helper: Standardize date parsing to YYYY-MM-DD
 */
const parseToDateString = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) {
    return moment(val).format("YYYY-MM-DD");
  }
  // Check Excel serial number
  if (typeof val === "number") {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) {
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${m}-${d}`;
    }
  }
  const str = String(val).trim();
  const parsed = moment(str, ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY/MM/DD"], true);
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }
  const loose = moment(str);
  return loose.isValid() ? loose.format("YYYY-MM-DD") : null;
};

/**
 * Helper: Normalize branch name
 */
const normalizeBranchName = (raw) => {
  if (!raw) return null;
  const clean = String(raw).trim().toLowerCase();
  for (const b of TRANSPORT_BRANCHES) {
    if (b.toLowerCase() === clean) return b;
  }
  // Loose matching for common typos / spacing
  if (clean.includes("khodiyar")) return "ICD Khodiyar";
  if (clean.includes("sanand")) return "ICD Sanand";
  if (clean.includes("mundra")) return "ICD Mundra";
  if (clean.includes("airport")) return "ICD Airport";
  if (clean.includes("hazira")) return "ICD Hazira";
  if (clean.includes("sachana")) return "ICD Sachana";
  if (clean.includes("baroda") || clean.includes("vadodara")) return "ICD Baroda";
  return null;
};

/**
 * Helper: Normalize sundry debtor particulars
 */
const normalizeSundryParticulars = (raw) => {
  if (!raw) return null;
  const clean = String(raw).trim().toLowerCase();
  if (clean.includes("direct party") || clean === "direct") return "Direct Party";
  if (clean.includes("suraj")) return "Suraj Forwarders Pvt. Ltd.";
  if (clean.includes("transporter") || clean.includes("additional")) return "Additional Transporter";
  for (const p of SUNDRY_DEBTOR_PARTICULARS) {
    if (p.toLowerCase() === clean) return p;
  }
  return null;
};

// ==========================================
// 1. DASHBOARD API
// ==========================================
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const { userId, isAdmin } = resolveUserScope(req);
    const { filter = "day", date, startDate, endDate } = req.query;

    let rangeStart;
    let rangeEnd;
    const now = moment();

    if (filter === "day") {
      const targetDate = date ? parseToDateString(date) : now.format("YYYY-MM-DD");
      rangeStart = targetDate;
      rangeEnd = targetDate;
    } else if (filter === "week") {
      const ref = date ? moment(date) : now;
      rangeStart = ref.clone().startOf("isoWeek").format("YYYY-MM-DD");
      rangeEnd = ref.clone().endOf("isoWeek").format("YYYY-MM-DD");
    } else if (filter === "month") {
      const ref = date ? moment(date) : now;
      rangeStart = ref.clone().startOf("month").format("YYYY-MM-DD");
      rangeEnd = ref.clone().endOf("month").format("YYYY-MM-DD");
    } else if (filter === "custom") {
      rangeStart = startDate ? parseToDateString(startDate) : now.clone().subtract(30, "days").format("YYYY-MM-DD");
      rangeEnd = endDate ? parseToDateString(endDate) : now.format("YYYY-MM-DD");
    } else {
      rangeStart = now.format("YYYY-MM-DD");
      rangeEnd = now.format("YYYY-MM-DD");
    }

    const baseFilter = {
      date: { $gte: rangeStart, $lte: rangeEnd }
    };
    if (userId) {
      baseFilter.user_id = userId;
    }

    // Branch Aggregation
    const branchEntries = await TransportBranchInvoicingModel.find(baseFilter).lean();

    // Group by branch
    const branchTotalsMap = {};
    for (const b of TRANSPORT_BRANCHES) {
      branchTotalsMap[b] = {
        branch: b,
        invoice_count: 0,
        invoice_amount: 0,
        pending_lrs: 0
      };
    }

    let totalInvoiceCount = 0;
    let totalInvoiceAmount = 0;
    let totalPendingLrs = 0;

    branchEntries.forEach((entry) => {
      const bName = entry.branch;
      if (branchTotalsMap[bName]) {
        branchTotalsMap[bName].invoice_count += Number(entry.invoice_count || 0);
        branchTotalsMap[bName].invoice_amount += Number(entry.invoice_amount || 0);
        branchTotalsMap[bName].pending_lrs += Number(entry.pending_lrs || 0);
      }
      totalInvoiceCount += Number(entry.invoice_count || 0);
      totalInvoiceAmount += Number(entry.invoice_amount || 0);
      totalPendingLrs += Number(entry.pending_lrs || 0);
    });

    const branchList = TRANSPORT_BRANCHES.map((b) => branchTotalsMap[b]);

    // Sundry Debtors Aggregation
    const sundryEntries = await TransportSundryDebtorModel.find(baseFilter).lean();
    const sundryTotalsMap = {};
    for (const p of SUNDRY_DEBTOR_PARTICULARS) {
      sundryTotalsMap[p] = {
        particulars: p,
        amount: 0
      };
    }
    let totalSundryDebtors = 0;
    sundryEntries.forEach((entry) => {
      if (sundryTotalsMap[entry.particulars]) {
        sundryTotalsMap[entry.particulars].amount += Number(entry.amount || 0);
      }
      totalSundryDebtors += Number(entry.amount || 0);
    });
    const sundryList = SUNDRY_DEBTOR_PARTICULARS.map((p) => sundryTotalsMap[p]);

    // Direct Income Aggregation
    const directIncomeEntries = await TransportDirectIncomeModel.find(baseFilter).lean();
    const directIncomeTotal = directIncomeEntries.reduce((sum, d) => sum + Number(d.amount || 0), 0);

    return res.status(200).json({
      success: true,
      period: {
        filter,
        startDate: rangeStart,
        endDate: rangeEnd,
        label: filter === "day" ? rangeStart : `${rangeStart} to ${rangeEnd}`
      },
      kpi: {
        total_invoice_count: totalInvoiceCount,
        total_invoice_amount: totalInvoiceAmount,
        total_pending_lrs: totalPendingLrs,
        direct_income_total: directIncomeTotal,
        total_sundry_debtors: totalSundryDebtors
      },
      branches: branchList,
      branch_totals: {
        invoice_count: totalInvoiceCount,
        invoice_amount: totalInvoiceAmount,
        pending_lrs: totalPendingLrs
      },
      sundry_debtors: sundryList,
      sundry_debtors_total: totalSundryDebtors,
      user_scope: {
        userId,
        isAdmin
      }
    });
  } catch (error) {
    console.error("Error in transport dashboard API:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load transport dashboard" });
  }
});

// ==========================================
// 2. DAILY INVOICING API (GET & UNIFIED SAVE)
// ==========================================
router.get("/daily", authMiddleware, async (req, res) => {
  try {
    const { userId } = resolveUserScope(req);
    const targetDate = parseToDateString(req.query.date) || moment().format("YYYY-MM-DD");

    const query = { date: targetDate };
    if (userId) query.user_id = userId;

    const [branchDocs, sundryDocs, directIncomeDoc] = await Promise.all([
      TransportBranchInvoicingModel.find(query).lean(),
      TransportSundryDebtorModel.find(query).lean(),
      TransportDirectIncomeModel.findOne(query).lean()
    ]);

    // Ensure all 7 branches are represented in order
    const branchMap = {};
    branchDocs.forEach((b) => {
      branchMap[b.branch] = b;
    });

    const branches = TRANSPORT_BRANCHES.map((bName) => {
      const existing = branchMap[bName];
      return existing
        ? {
            _id: existing._id,
            branch: bName,
            invoice_count: existing.invoice_count,
            invoice_amount: existing.invoice_amount,
            pending_lrs: existing.pending_lrs,
            isExisting: true
          }
        : {
            branch: bName,
            invoice_count: 0,
            invoice_amount: 0,
            pending_lrs: 0,
            isExisting: false
          };
    });

    // Ensure all 3 sundry debtors are represented
    const sundryMap = {};
    sundryDocs.forEach((s) => {
      sundryMap[s.particulars] = s;
    });

    const sundryDebtors = SUNDRY_DEBTOR_PARTICULARS.map((pName) => {
      const existing = sundryMap[pName];
      return existing
        ? {
            _id: existing._id,
            particulars: pName,
            amount: existing.amount,
            isExisting: true
          }
        : {
            particulars: pName,
            amount: 0,
            isExisting: false
          };
    });

    const directIncomeAmount = directIncomeDoc ? Number(directIncomeDoc.amount || 0) : 0;

    const totals = {
      total_invoice_count: branches.reduce((s, b) => s + Number(b.invoice_count || 0), 0),
      total_invoice_amount: branches.reduce((s, b) => s + Number(b.invoice_amount || 0), 0),
      total_pending_lrs: branches.reduce((s, b) => s + Number(b.pending_lrs || 0), 0),
      total_sundry_debtors: sundryDebtors.reduce((s, sd) => s + Number(sd.amount || 0), 0),
      direct_income: directIncomeAmount
    };

    return res.status(200).json({
      success: true,
      date: targetDate,
      branches,
      sundry_debtors: sundryDebtors,
      direct_income: directIncomeAmount,
      totals
    });
  } catch (error) {
    console.error("Error fetching daily entries:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch daily entries" });
  }
});

router.post("/daily", authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.body.userId && req.user.role === "Admin" ? req.body.userId : req.user._id;
    const targetUsername = req.body.username && req.user.role === "Admin" ? req.body.username : req.user.username;

    const rawDate = req.body.date;
    const dateStr = parseToDateString(rawDate);
    if (!dateStr) {
      return res.status(400).json({ success: false, message: "A valid date (YYYY-MM-DD) is required." });
    }

    const { branches = [], sundry_debtors = [], direct_income = 0 } = req.body;

    // Validate branches
    for (const b of branches) {
      if (!TRANSPORT_BRANCHES.includes(b.branch)) {
        return res.status(400).json({ success: false, message: `Invalid branch name: ${b.branch}` });
      }
      if (Number(b.invoice_count) < 0 || Number(b.invoice_amount) < 0 || Number(b.pending_lrs) < 0) {
        return res.status(400).json({ success: false, message: `Values cannot be negative for branch: ${b.branch}` });
      }
    }

    // Validate sundry debtors
    for (const sd of sundry_debtors) {
      if (!SUNDRY_DEBTOR_PARTICULARS.includes(sd.particulars)) {
        return res.status(400).json({ success: false, message: `Invalid sundry debtor: ${sd.particulars}` });
      }
      if (Number(sd.amount) < 0) {
        return res.status(400).json({ success: false, message: `Amount cannot be negative for: ${sd.particulars}` });
      }
    }

    // Validate direct income
    if (Number(direct_income) < 0) {
      return res.status(400).json({ success: false, message: "Direct Income cannot be negative." });
    }

    // Save/Upsert Branch Invoicings
    const branchPromises = branches.map(async (b) => {
      const existing = await TransportBranchInvoicingModel.findOne({
        user_id: targetUserId,
        date: dateStr,
        branch: b.branch
      });

      const auditEvent = {
        action: existing ? "UPDATE" : "CREATE",
        field: "daily_entry",
        old_value: existing ? { count: existing.invoice_count, amount: existing.invoice_amount, pending: existing.pending_lrs } : null,
        new_value: { count: Number(b.invoice_count || 0), amount: Number(b.invoice_amount || 0), pending: Number(b.pending_lrs || 0) },
        user: req.user.username,
        user_id: req.user._id,
        timestamp: new Date()
      };

      return TransportBranchInvoicingModel.findOneAndUpdate(
        { user_id: targetUserId, date: dateStr, branch: b.branch },
        {
          $set: {
            username: targetUsername,
            invoice_count: Number(b.invoice_count || 0),
            invoice_amount: Number(b.invoice_amount || 0),
            pending_lrs: Number(b.pending_lrs || 0),
            updated_by: req.user.username
          },
          $setOnInsert: {
            created_by: req.user.username
          },
          $push: { audit_trail: auditEvent }
        },
        { upsert: true, new: true, runValidators: true }
      );
    });

    // Save/Upsert Sundry Debtors
    const sundryPromises = sundry_debtors.map(async (sd) => {
      const existing = await TransportSundryDebtorModel.findOne({
        user_id: targetUserId,
        date: dateStr,
        particulars: sd.particulars
      });

      const auditEvent = {
        action: existing ? "UPDATE" : "CREATE",
        field: "amount",
        old_value: existing ? existing.amount : null,
        new_value: Number(sd.amount || 0),
        user: req.user.username,
        user_id: req.user._id,
        timestamp: new Date()
      };

      return TransportSundryDebtorModel.findOneAndUpdate(
        { user_id: targetUserId, date: dateStr, particulars: sd.particulars },
        {
          $set: {
            username: targetUsername,
            amount: Number(sd.amount || 0),
            updated_by: req.user.username
          },
          $setOnInsert: {
            created_by: req.user.username
          },
          $push: { audit_trail: auditEvent }
        },
        { upsert: true, new: true, runValidators: true }
      );
    });

    // Save/Upsert Direct Income
    const existingDirect = await TransportDirectIncomeModel.findOne({
      user_id: targetUserId,
      date: dateStr
    });

    const directAudit = {
      action: existingDirect ? "UPDATE" : "CREATE",
      field: "amount",
      old_value: existingDirect ? existingDirect.amount : null,
      new_value: Number(direct_income || 0),
      user: req.user.username,
      user_id: req.user._id,
      timestamp: new Date()
    };

    const directPromise = TransportDirectIncomeModel.findOneAndUpdate(
      { user_id: targetUserId, date: dateStr },
      {
        $set: {
          username: targetUsername,
          amount: Number(direct_income || 0),
          updated_by: req.user.username
        },
        $setOnInsert: {
          created_by: req.user.username
        },
        $push: { audit_trail: directAudit }
      },
      { upsert: true, new: true, runValidators: true }
    );

    await Promise.all([...branchPromises, ...sundryPromises, directPromise]);

    return res.status(200).json({
      success: true,
      message: `Daily invoicing saved successfully for date ${dateStr}`
    });
  } catch (error) {
    console.error("Error saving daily entry:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to save daily entries" });
  }
});

// ==========================================
// 3. INDIVIDUAL ENTITY ROUTES & MANUAL EDITS
// ==========================================
// Branch Invoicing list
router.get("/branches", authMiddleware, async (req, res) => {
  try {
    const { userId } = resolveUserScope(req);
    const { date, startDate, endDate, branch, page = 1, limit = 50 } = req.query;

    const query = {};
    if (userId) query.user_id = userId;
    if (date) query.date = parseToDateString(date);
    else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = parseToDateString(startDate);
      if (endDate) query.date.$lte = parseToDateString(endDate);
    }
    if (branch) query.branch = branch;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [docs, total] = await Promise.all([
      TransportBranchInvoicingModel.find(query).sort({ date: -1, branch: 1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      TransportBranchInvoicingModel.countDocuments(query)
    ]);

    return res.status(200).json({ success: true, docs, total, page: parseInt(page, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Branch Invoicing manual edit
router.put("/branches/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await TransportBranchInvoicingModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Branch entry not found" });

    // Permissions: non-admin can only edit their own records
    if (req.user.role !== "Admin" && doc.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access Denied: You can only edit your own entries." });
    }

    const { invoice_count, invoice_amount, pending_lrs, reason } = req.body;
    if (invoice_count !== undefined && Number(invoice_count) < 0) {
      return res.status(400).json({ success: false, message: "Invoice count cannot be negative" });
    }
    if (invoice_amount !== undefined && Number(invoice_amount) < 0) {
      return res.status(400).json({ success: false, message: "Invoice amount cannot be negative" });
    }
    if (pending_lrs !== undefined && Number(pending_lrs) < 0) {
      return res.status(400).json({ success: false, message: "Pending LRs cannot be negative" });
    }

    const oldValues = {
      invoice_count: doc.invoice_count,
      invoice_amount: doc.invoice_amount,
      pending_lrs: doc.pending_lrs
    };

    if (invoice_count !== undefined) doc.invoice_count = Number(invoice_count);
    if (invoice_amount !== undefined) doc.invoice_amount = Number(invoice_amount);
    if (pending_lrs !== undefined) doc.pending_lrs = Number(pending_lrs);
    doc.updated_by = req.user.username;

    doc.audit_trail.push({
      action: "UPDATE",
      field: "manual_edit",
      old_value: oldValues,
      new_value: { invoice_count: doc.invoice_count, invoice_amount: doc.invoice_amount, pending_lrs: doc.pending_lrs },
      user: req.user.username,
      user_id: req.user._id,
      timestamp: new Date(),
      reason: reason || "Manual edit"
    });

    await doc.save();
    return res.status(200).json({ success: true, message: "Branch entry updated successfully", doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Sundry Debtors list
router.get("/sundry-debtors", authMiddleware, async (req, res) => {
  try {
    const { userId } = resolveUserScope(req);
    const { date, startDate, endDate, particulars } = req.query;

    const query = {};
    if (userId) query.user_id = userId;
    if (date) query.date = parseToDateString(date);
    else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = parseToDateString(startDate);
      if (endDate) query.date.$lte = parseToDateString(endDate);
    }
    if (particulars) query.particulars = particulars;

    const docs = await TransportSundryDebtorModel.find(query).sort({ date: -1, particulars: 1 }).lean();
    return res.status(200).json({ success: true, docs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Sundry Debtors manual edit
router.put("/sundry-debtors/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await TransportSundryDebtorModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Sundry debtor entry not found" });

    if (req.user.role !== "Admin" && doc.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access Denied: You can only edit your own entries." });
    }

    const { amount, reason } = req.body;
    if (amount !== undefined && Number(amount) < 0) {
      return res.status(400).json({ success: false, message: "Amount cannot be negative" });
    }

    const oldAmount = doc.amount;
    doc.amount = Number(amount);
    doc.updated_by = req.user.username;

    doc.audit_trail.push({
      action: "UPDATE",
      field: "amount",
      old_value: oldAmount,
      new_value: doc.amount,
      user: req.user.username,
      user_id: req.user._id,
      timestamp: new Date(),
      reason: reason || "Manual edit"
    });

    await doc.save();
    return res.status(200).json({ success: true, message: "Sundry debtor updated successfully", doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Direct Income list
router.get("/direct-income", authMiddleware, async (req, res) => {
  try {
    const { userId } = resolveUserScope(req);
    const { date, startDate, endDate } = req.query;

    const query = {};
    if (userId) query.user_id = userId;
    if (date) query.date = parseToDateString(date);
    else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = parseToDateString(startDate);
      if (endDate) query.date.$lte = parseToDateString(endDate);
    }

    const docs = await TransportDirectIncomeModel.find(query).sort({ date: -1 }).lean();
    return res.status(200).json({ success: true, docs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Direct Income manual edit
router.put("/direct-income/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await TransportDirectIncomeModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Direct income entry not found" });

    if (req.user.role !== "Admin" && doc.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access Denied: You can only edit your own entries." });
    }

    const { amount, reason } = req.body;
    if (amount !== undefined && Number(amount) < 0) {
      return res.status(400).json({ success: false, message: "Amount cannot be negative" });
    }

    const oldAmount = doc.amount;
    doc.amount = Number(amount);
    doc.updated_by = req.user.username;

    doc.audit_trail.push({
      action: "UPDATE",
      field: "amount",
      old_value: oldAmount,
      new_value: doc.amount,
      user: req.user.username,
      user_id: req.user._id,
      timestamp: new Date(),
      reason: reason || "Manual edit"
    });

    await doc.save();
    return res.status(200).json({ success: true, message: "Direct income updated successfully", doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Delete entry (Admin only)
router.delete("/entry", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Permanent deletion is restricted to Administrators only." });
    }
    const { type, id } = req.query;
    if (!type || !id) {
      return res.status(400).json({ success: false, message: "Type and ID are required" });
    }

    if (type === "branch") {
      await TransportBranchInvoicingModel.findByIdAndDelete(id);
    } else if (type === "sundry") {
      await TransportSundryDebtorModel.findByIdAndDelete(id);
    } else if (type === "direct") {
      await TransportDirectIncomeModel.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    return res.status(200).json({ success: true, message: "Entry permanently deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. EXCEL UPLOAD: VALIDATE & PREVIEW
// ==========================================
router.post("/upload/preview", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "Please provide an Excel file (.xlsx or .xls)" });
    }

    const { userId, username } = resolveUserScope(req);
    const targetUserId = userId || req.user._id;

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;

    const newRecords = [];
    const updatedRecords = [];
    const duplicateRecords = [];
    const errors = [];

    // Helper: Identify sheets
    const dailySheetName = sheetNames.find((s) => /daily.*invoic/i.test(s)) || (sheetNames.length === 1 ? sheetNames[0] : null);
    const sundrySheetName = sheetNames.find((s) => /sundry.*debt/i.test(s));
    const directSheetName = sheetNames.find((s) => /direct.*income/i.test(s));

    // 1. Parse Daily Invoicing Sheet
    if (dailySheetName && workbook.Sheets[dailySheetName]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[dailySheetName], { header: 1, defval: null });
      if (rows && rows.length > 1) {
        // Find header row: must have at least 3 non-empty columns including 'branch' and ('count' or 'amount' or 'invoice')
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const nonNullCols = (rows[i] || []).filter((c) => c !== null && String(c).trim() !== "");
          if (
            nonNullCols.length >= 3 &&
            nonNullCols.some((c) => String(c).toLowerCase().includes("branch")) &&
            nonNullCols.some((c) => String(c).toLowerCase().includes("count") || String(c).toLowerCase().includes("amount") || String(c).toLowerCase().includes("invoice"))
          ) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          const header = rows[headerRowIdx].map((h) => String(h || "").trim().toLowerCase());
          const dateIdx = header.findIndex((h) => h.includes("date"));
          const branchIdx = header.findIndex((h) => h.includes("branch"));
          const countIdx = header.findIndex((h) => h.includes("count"));
          const amountIdx = header.findIndex((h) => h.includes("amount"));
          const pendingIdx = header.findIndex((h) => h.includes("pending") || h.includes("lr"));

          for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0 || row.every((c) => c === null || c === "")) continue;

            const rawBranch = branchIdx !== -1 ? row[branchIdx] : null;
            if (!rawBranch || String(rawBranch).trim().toUpperCase().startsWith("TOTAL")) continue;

            const normBranch = normalizeBranchName(rawBranch);
            if (!normBranch) {
              errors.push({
                sheet: dailySheetName,
                rowNumber: r + 1,
                branch: rawBranch,
                message: `Unknown or unmapped branch: "${rawBranch}". Must be one of the 7 transport branches.`
              });
              continue;
            }

            const rawDate = dateIdx !== -1 ? row[dateIdx] : null;
            const normDate = parseToDateString(rawDate);
            if (!normDate) {
              errors.push({
                sheet: dailySheetName,
                rowNumber: r + 1,
                branch: normBranch,
                message: `Invalid or missing date: "${rawDate}". Expected YYYY-MM-DD or valid date.`
              });
              continue;
            }

            const countVal = countIdx !== -1 ? Number(row[countIdx] || 0) : 0;
            const amountVal = amountIdx !== -1 ? Number(row[amountIdx] || 0) : 0;
            const pendingVal = pendingIdx !== -1 ? Number(row[pendingIdx] || 0) : 0;

            if (isNaN(countVal) || countVal < 0 || isNaN(amountVal) || amountVal < 0 || isNaN(pendingVal) || pendingVal < 0) {
              errors.push({
                sheet: dailySheetName,
                rowNumber: r + 1,
                branch: normBranch,
                date: normDate,
                message: "Invoice count, amount, and pending LRs cannot be negative or invalid numbers."
              });
              continue;
            }

            // Check against existing database record for this user
            const existing = await TransportBranchInvoicingModel.findOne({
              user_id: targetUserId,
              date: normDate,
              branch: normBranch
            }).lean();

            const recordData = {
              type: "branch",
              date: normDate,
              branch: normBranch,
              invoice_count: countVal,
              invoice_amount: amountVal,
              pending_lrs: pendingVal
            };

            if (!existing) {
              newRecords.push(recordData);
            } else {
              const isIdentical =
                existing.invoice_count === countVal &&
                existing.invoice_amount === amountVal &&
                existing.pending_lrs === pendingVal;

              if (isIdentical) {
                duplicateRecords.push({
                  ...recordData,
                  existing_id: existing._id,
                  message: "Identical record already exists in database."
                });
              } else {
                updatedRecords.push({
                  ...recordData,
                  existing_id: existing._id,
                  old_values: {
                    invoice_count: existing.invoice_count,
                    invoice_amount: existing.invoice_amount,
                    pending_lrs: existing.pending_lrs
                  },
                  new_values: {
                    invoice_count: countVal,
                    invoice_amount: amountVal,
                    pending_lrs: pendingVal
                  }
                });
              }
            }
          }
        }
      }
    }

    // 2. Parse Sundry Debtors Sheet
    if (sundrySheetName && workbook.Sheets[sundrySheetName]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sundrySheetName], { header: 1, defval: null });
      if (rows && rows.length > 0) {
        // Find header row: must have at least 3 non-empty columns including 'direct'/'particulars' and 'suraj'/'transporter'/'debtor'
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const nonNullCols = (rows[i] || []).filter((c) => c !== null && String(c).trim() !== "");
          if (
            nonNullCols.length >= 3 &&
            nonNullCols.some((c) => String(c).toLowerCase().includes("direct") || String(c).toLowerCase().includes("particulars")) &&
            nonNullCols.some((c) => String(c).toLowerCase().includes("suraj") || String(c).toLowerCase().includes("transporter") || String(c).toLowerCase().includes("debtor"))
          ) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          const header = rows[headerRowIdx].map((h) => String(h || "").trim().toLowerCase());
          const dateIdx = header.findIndex((h) => h.includes("date"));

          // Columnar format (like template: Date, Direct Party, Suraj Forwarders, Transporter)
          const directIdx = header.findIndex((h) => h.includes("direct"));
          const surajIdx = header.findIndex((h) => h.includes("suraj"));
          const transporterIdx = header.findIndex((h) => h.includes("transporter"));

          for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0 || row.every((c) => c === null || c === "")) continue;

            const rawDate = dateIdx !== -1 ? row[dateIdx] : null;
            const normDate = parseToDateString(rawDate);
            if (!normDate) continue;

            const itemsToProcess = [];
            if (directIdx !== -1 && row[directIdx] !== null && row[directIdx] !== "") {
              itemsToProcess.push({ particulars: "Direct Party", amount: Number(row[directIdx] || 0) });
            }
            if (surajIdx !== -1 && row[surajIdx] !== null && row[surajIdx] !== "") {
              itemsToProcess.push({ particulars: "Suraj Forwarders Pvt. Ltd.", amount: Number(row[surajIdx] || 0) });
            }
            if (transporterIdx !== -1 && row[transporterIdx] !== null && row[transporterIdx] !== "") {
              itemsToProcess.push({ particulars: "Additional Transporter", amount: Number(row[transporterIdx] || 0) });
            }

            for (const item of itemsToProcess) {
              if (isNaN(item.amount) || item.amount < 0) {
                errors.push({
                  sheet: sundrySheetName,
                  rowNumber: r + 1,
                  date: normDate,
                  particulars: item.particulars,
                  message: `Sundry Debtor amount for ${item.particulars} cannot be negative or invalid.`
                });
                continue;
              }

              const existing = await TransportSundryDebtorModel.findOne({
                user_id: targetUserId,
                date: normDate,
                particulars: item.particulars
              }).lean();

              const recordData = {
                type: "sundry",
                date: normDate,
                particulars: item.particulars,
                amount: item.amount
              };

              if (!existing) {
                newRecords.push(recordData);
              } else if (existing.amount === item.amount) {
                duplicateRecords.push({
                  ...recordData,
                  existing_id: existing._id,
                  message: "Identical sundry debtor record exists."
                });
              } else {
                updatedRecords.push({
                  ...recordData,
                  existing_id: existing._id,
                  old_values: { amount: existing.amount },
                  new_values: { amount: item.amount }
                });
              }
            }
          }
        }
      }
    }

    // 3. Parse Direct Income Sheet
    if (directSheetName && workbook.Sheets[directSheetName]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[directSheetName], { header: 1, defval: null });
      if (rows && rows.length > 0) {
        // Find header row: must contain 'direct income' and ('amount' or 'date')
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const nonNullCols = (rows[i] || []).filter((c) => c !== null && String(c).trim() !== "");
          if (
            nonNullCols.some((c) => String(c).toLowerCase().includes("direct income")) &&
            nonNullCols.some((c) => String(c).toLowerCase().includes("amount") || String(c).toLowerCase().includes("date"))
          ) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          const header = rows[headerRowIdx].map((h) => String(h || "").trim().toLowerCase());
          const dateIdx = header.findIndex((h) => h.includes("date"));
          const amountIdx = header.findIndex((h) => h.includes("amount") || h.includes("direct"));

          for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0 || row.every((c) => c === null || c === "")) continue;

            const rawDate = dateIdx !== -1 ? row[dateIdx] : null;
            const normDate = parseToDateString(rawDate);
            if (!normDate) continue;

            const rawAmount = amountIdx !== -1 ? Number(row[amountIdx] || 0) : 0;
            if (isNaN(rawAmount) || rawAmount < 0) {
              errors.push({
                sheet: directSheetName,
                rowNumber: r + 1,
                date: normDate,
                message: "Direct Income amount cannot be negative or invalid."
              });
              continue;
            }

            const existing = await TransportDirectIncomeModel.findOne({
              user_id: targetUserId,
              date: normDate
            }).lean();

            const recordData = {
              type: "direct",
              date: normDate,
              amount: rawAmount
            };

            if (!existing) {
              newRecords.push(recordData);
            } else if (existing.amount === rawAmount) {
              duplicateRecords.push({
                ...recordData,
                existing_id: existing._id,
                message: "Identical direct income record exists."
              });
            } else {
              updatedRecords.push({
                ...recordData,
                existing_id: existing._id,
                old_values: { amount: existing.amount },
                new_values: { amount: rawAmount }
              });
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        total_rows_parsed: newRecords.length + updatedRecords.length + duplicateRecords.length + errors.length,
        new_count: newRecords.length,
        updated_count: updatedRecords.length,
        duplicate_count: duplicateRecords.length,
        error_count: errors.length
      },
      new_records: newRecords,
      updated_records: updatedRecords,
      duplicate_records: duplicateRecords,
      errors
    });
  } catch (error) {
    console.error("Error in upload preview API:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to process Excel upload" });
  }
});

// ==========================================
// 5. EXCEL UPLOAD: CONFIRM & MASTER UPDATE
// ==========================================
router.post("/upload/confirm", authMiddleware, async (req, res) => {
  try {
    const { new_records = [], updated_records = [] } = req.body;
    const { userId, username } = resolveUserScope(req);
    const targetUserId = userId || req.user._id;
    const targetUsername = username || req.user.username;

    let createdCount = 0;
    let updatedCount = 0;

    // 1. Process New Records
    for (const rec of new_records) {
      if (rec.type === "branch") {
        await TransportBranchInvoicingModel.create({
          user_id: targetUserId,
          username: targetUsername,
          date: rec.date,
          branch: rec.branch,
          invoice_count: Number(rec.invoice_count || 0),
          invoice_amount: Number(rec.invoice_amount || 0),
          pending_lrs: Number(rec.pending_lrs || 0),
          created_by: req.user.username,
          updated_by: req.user.username,
          audit_trail: [
            {
              action: "CREATE",
              field: "excel_upload",
              new_value: rec,
              user: req.user.username,
              user_id: req.user._id,
              timestamp: new Date()
            }
          ]
        });
        createdCount += 1;
      } else if (rec.type === "sundry") {
        await TransportSundryDebtorModel.create({
          user_id: targetUserId,
          username: targetUsername,
          date: rec.date,
          particulars: rec.particulars,
          amount: Number(rec.amount || 0),
          created_by: req.user.username,
          updated_by: req.user.username,
          audit_trail: [
            {
              action: "CREATE",
              field: "excel_upload",
              new_value: rec,
              user: req.user.username,
              user_id: req.user._id,
              timestamp: new Date()
            }
          ]
        });
        createdCount += 1;
      } else if (rec.type === "direct") {
        await TransportDirectIncomeModel.create({
          user_id: targetUserId,
          username: targetUsername,
          date: rec.date,
          amount: Number(rec.amount || 0),
          created_by: req.user.username,
          updated_by: req.user.username,
          audit_trail: [
            {
              action: "CREATE",
              field: "excel_upload",
              new_value: rec,
              user: req.user.username,
              user_id: req.user._id,
              timestamp: new Date()
            }
          ]
        });
        createdCount += 1;
      }
    }

    // 2. Process Updated Records
    for (const rec of updated_records) {
      if (rec.type === "branch") {
        await TransportBranchInvoicingModel.findOneAndUpdate(
          { user_id: targetUserId, date: rec.date, branch: rec.branch },
          {
            $set: {
              invoice_count: Number(rec.new_values.invoice_count || 0),
              invoice_amount: Number(rec.new_values.invoice_amount || 0),
              pending_lrs: Number(rec.new_values.pending_lrs || 0),
              updated_by: req.user.username
            },
            $push: {
              audit_trail: {
                action: "UPLOAD_UPDATE",
                field: "excel_update",
                old_value: rec.old_values,
                new_value: rec.new_values,
                user: req.user.username,
                user_id: req.user._id,
                timestamp: new Date()
              }
            }
          }
        );
        updatedCount += 1;
      } else if (rec.type === "sundry") {
        await TransportSundryDebtorModel.findOneAndUpdate(
          { user_id: targetUserId, date: rec.date, particulars: rec.particulars },
          {
            $set: {
              amount: Number(rec.new_values.amount || 0),
              updated_by: req.user.username
            },
            $push: {
              audit_trail: {
                action: "UPLOAD_UPDATE",
                field: "amount",
                old_value: rec.old_values,
                new_value: rec.new_values,
                user: req.user.username,
                user_id: req.user._id,
                timestamp: new Date()
              }
            }
          }
        );
        updatedCount += 1;
      } else if (rec.type === "direct") {
        await TransportDirectIncomeModel.findOneAndUpdate(
          { user_id: targetUserId, date: rec.date },
          {
            $set: {
              amount: Number(rec.new_values.amount || 0),
              updated_by: req.user.username
            },
            $push: {
              audit_trail: {
                action: "UPLOAD_UPDATE",
                field: "amount",
                old_value: rec.old_values,
                new_value: rec.new_values,
                user: req.user.username,
                user_id: req.user._id,
                timestamp: new Date()
              }
            }
          }
        );
        updatedCount += 1;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Master data updated successfully! ${createdCount} new records created, ${updatedCount} records updated.`
    });
  } catch (error) {
    console.error("Error confirming upload:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to commit upload" });
  }
});

// ==========================================
// 6. DOWNLOAD TEMPLATES API (HIGH-AESTHETIC EXCELJS)
// ==========================================
// Daily Invoicing Template (Section 21)
router.get("/template/daily", async (req, res) => {
  try {
    const targetDate = req.query.date || moment().format("YYYY-MM-DD");
    const buf = await generateDailyTemplateBuffer(targetDate);
    res.setHeader("Content-Disposition", 'attachment; filename="Daily_Invoicing_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buf);
  } catch (error) {
    console.error("Error generating daily template:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Sundry Debtors Template (Section 11/22)
router.get("/template/sundry-debtors", async (req, res) => {
  try {
    const targetDate = req.query.date || moment().format("YYYY-MM-DD");
    const buf = await generateSundryTemplateBuffer(targetDate);
    res.setHeader("Content-Disposition", 'attachment; filename="Sundry_Debtors_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buf);
  } catch (error) {
    console.error("Error generating sundry debtors template:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Direct Income Template
router.get("/template/direct-income", async (req, res) => {
  try {
    const targetDate = req.query.date || moment().format("YYYY-MM-DD");
    const buf = await generateDirectIncomeTemplateBuffer(targetDate);
    res.setHeader("Content-Disposition", 'attachment; filename="Direct_Income_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buf);
  } catch (error) {
    console.error("Error generating direct income template:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Full Master Template (Matching Ayan_Invoicing_Template.xlsx)
router.get("/template/master", async (req, res) => {
  try {
    const targetDate = req.query.date || moment().format("YYYY-MM-DD");
    const buf = await generateMasterWorkbookBuffer(targetDate);
    res.setHeader("Content-Disposition", 'attachment; filename="Ayan_Invoicing_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buf);
  } catch (error) {
    console.error("Error generating master template:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 7. MONTHLY REPORT API
// ==========================================
router.get("/monthly-report", authMiddleware, async (req, res) => {
  try {
    const { userId } = resolveUserScope(req);
    const monthStr = req.query.month || moment().format("YYYY-MM");
    const m = moment(monthStr, "YYYY-MM");
    if (!m.isValid()) {
      return res.status(400).json({ success: false, message: "Invalid month format (expected YYYY-MM)" });
    }

    const startOfMonth = m.clone().startOf("month").format("YYYY-MM-DD");
    const endOfMonth = m.clone().endOf("month").format("YYYY-MM-DD");
    const daysInMonth = m.daysInMonth();

    const query = {
      date: { $gte: startOfMonth, $lte: endOfMonth }
    };
    if (userId) query.user_id = userId;

    const [branchDocs, sundryDocs, directDocs] = await Promise.all([
      TransportBranchInvoicingModel.find(query).lean(),
      TransportSundryDebtorModel.find(query).lean(),
      TransportDirectIncomeModel.find(query).lean()
    ]);

    // Build day-wise dictionary
    const days = [];
    const branchTotalsMap = {};
    for (const b of TRANSPORT_BRANCHES) {
      branchTotalsMap[b] = { count: 0, amount: 0, pending: 0 };
    }

    let grandInvoiceCount = 0;
    let grandInvoiceAmount = 0;
    let grandPendingLrs = 0;
    let grandSundryDebtors = 0;
    let grandDirectIncome = 0;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${monthStr}-${String(dayNum).padStart(2, "0")}`;
      const dayBranches = branchDocs.filter((b) => b.date === dateStr);
      const daySundry = sundryDocs.filter((s) => s.date === dateStr);
      const dayDirect = directDocs.find((d) => d.date === dateStr);

      const dayBranchObj = {};
      let dayCount = 0;
      let dayAmount = 0;
      let dayPending = 0;

      for (const bName of TRANSPORT_BRANCHES) {
        const found = dayBranches.find((x) => x.branch === bName);
        const c = found ? Number(found.invoice_count || 0) : 0;
        const a = found ? Number(found.invoice_amount || 0) : 0;
        const p = found ? Number(found.pending_lrs || 0) : 0;
        dayBranchObj[bName] = { count: c, amount: a, pending: p };

        dayCount += c;
        dayAmount += a;
        dayPending += p;

        branchTotalsMap[bName].count += c;
        branchTotalsMap[bName].amount += a;
        branchTotalsMap[bName].pending += p;
      }

      const daySundryTotal = daySundry.reduce((s, sd) => s + Number(sd.amount || 0), 0);
      const dayDirectTotal = dayDirect ? Number(dayDirect.amount || 0) : 0;

      grandInvoiceCount += dayCount;
      grandInvoiceAmount += dayAmount;
      grandPendingLrs += dayPending;
      grandSundryDebtors += daySundryTotal;
      grandDirectIncome += dayDirectTotal;

      days.push({
        date: dateStr,
        dayOfWeek: moment(dateStr).format("ddd"),
        branches: dayBranchObj,
        total_count: dayCount,
        total_amount: dayAmount,
        total_pending: dayPending,
        sundry_total: daySundryTotal,
        direct_income: dayDirectTotal,
        hasData: dayCount > 0 || dayAmount > 0 || dayPending > 0 || daySundryTotal > 0 || dayDirectTotal > 0
      });
    }

    return res.status(200).json({
      success: true,
      month: monthStr,
      days,
      branch_summary: branchTotalsMap,
      grand_totals: {
        invoice_count: grandInvoiceCount,
        invoice_amount: grandInvoiceAmount,
        pending_lrs: grandPendingLrs,
        sundry_debtors: grandSundryDebtors,
        direct_income: grandDirectIncome,
        grand_total_revenue: grandInvoiceAmount + grandDirectIncome
      }
    });
  } catch (error) {
    console.error("Error in monthly report API:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 8. AUDIT TRAIL API
// ==========================================
router.get("/audit-trail", authMiddleware, async (req, res) => {
  try {
    const { userId, isAdmin } = resolveUserScope(req);
    const { date, startDate, endDate, limit = 100 } = req.query;

    const matchQuery = {};
    if (!isAdmin && userId) {
      matchQuery.user_id = userId;
    }
    if (date) {
      matchQuery.date = parseToDateString(date);
    } else if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = parseToDateString(startDate);
      if (endDate) matchQuery.date.$lte = parseToDateString(endDate);
    }

    // Collect audit records from all 3 collections
    const [branches, sundry, direct] = await Promise.all([
      TransportBranchInvoicingModel.find(matchQuery, { branch: 1, date: 1, username: 1, audit_trail: 1 }).lean(),
      TransportSundryDebtorModel.find(matchQuery, { particulars: 1, date: 1, username: 1, audit_trail: 1 }).lean(),
      TransportDirectIncomeModel.find(matchQuery, { date: 1, username: 1, audit_trail: 1 }).lean()
    ]);

    const events = [];

    branches.forEach((b) => {
      (b.audit_trail || []).forEach((at) => {
        events.push({
          type: "Branch Invoicing",
          target: b.branch,
          date: b.date,
          username: b.username,
          ...at
        });
      });
    });

    sundry.forEach((s) => {
      (s.audit_trail || []).forEach((at) => {
        events.push({
          type: "Sundry Debtor",
          target: s.particulars,
          date: s.date,
          username: s.username,
          ...at
        });
      });
    });

    direct.forEach((d) => {
      (d.audit_trail || []).forEach((at) => {
        events.push({
          type: "Direct Income",
          target: "Direct Income Total",
          date: d.date,
          username: d.username,
          ...at
        });
      });
    });

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const paginatedEvents = events.slice(0, parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      total: events.length,
      events: paginatedEvents
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 9. ADMIN: LIST USERS FOR USER SELECTOR
// ==========================================
router.get("/users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const users = await UserModel.find({
      $or: [
        { modules: "Transport Invoicing" },
        { username: "ayan_chauhan" },
        { department: /account/i }
      ]
    }, { username: 1, first_name: 1, last_name: 1, designation: 1, role: 1 }).lean();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

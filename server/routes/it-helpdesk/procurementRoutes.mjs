import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ProcurementRequest from "../../model/it-helpdesk/procurementModel.mjs";
import ITUnifiedAsset from "../../model/it-helpdesk/unifiedAssetModel.mjs";
import ItVendor from "../../model/it-helpdesk/vendorModel.mjs";
import User from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local disk storage for procurement documents
const uploadDir = path.join(__dirname, "../../uploads/it-helpdesk/procurement");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${cleanBase}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const ext = path
      .extname(file.originalname || "")
      .toLowerCase()
      .replace(".", "");
    const allowed = [
      "pdf",
      "docx",
      "doc",
      "xlsx",
      "xls",
      "csv",
      "jpg",
      "jpeg",
      "png",
      "webp",
    ];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} is not allowed. Allowed: PDF, Word, Excel, Images`));
    }
  },
});

const router = express.Router();
router.use(authMiddleware);

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID parameter" });
  }
  next();
};

// Helper to determine next PR number
async function generateNextPRNumber() {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `PR-${currentYear}-`;
  const regex = new RegExp(`^PR-${currentYear}-([0-9]+)$`, "i");

  const items = await ProcurementRequest.find({ pr_number: regex }, { pr_number: 1 }).lean();

  let maxSeq = 0;
  for (const it of items) {
    if (!it.pr_number) continue;
    const match = it.pr_number.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextNum = maxSeq + 1;
  let nextPr = `${yearPrefix}${String(nextNum).padStart(3, "0")}`;

  while (
    await ProcurementRequest.findOne({
      pr_number: { $regex: new RegExp(`^${nextPr}$`, "i") },
    })
  ) {
    nextNum++;
    nextPr = `${yearPrefix}${String(nextNum).padStart(3, "0")}`;
  }

  return nextPr;
}

// Helper to generate next Asset Tag
async function generateNextAssetTag() {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `AST-${currentYear}-`;
  const regex = new RegExp(`^AST-${currentYear}-([0-9]+)$`, "i");

  const items = await ITUnifiedAsset.find({ asset_tag: regex }, { asset_tag: 1 }).lean();

  let maxSeq = 0;
  for (const it of items) {
    if (!it.asset_tag) continue;
    const match = it.asset_tag.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextNum = maxSeq + 1;
  let nextTag = `${yearPrefix}${String(nextNum).padStart(3, "0")}`;

  while (
    await ITUnifiedAsset.findOne({
      asset_tag: { $regex: new RegExp(`^${nextTag}$`, "i") },
    })
  ) {
    nextNum++;
    nextTag = `${yearPrefix}${String(nextNum).padStart(3, "0")}`;
  }

  return nextTag;
}

// ── 1. GET STATS ─────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [
      total,
      quotationPending,
      itReview,
      hodPending,
      gmPending,
      poCreated,
      goodsReceived,
      invoiceVerification,
      paymentPending,
      completed,
      rejected,
      returned,
    ] = await Promise.all([
      ProcurementRequest.countDocuments({}),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: 2 }, { overall_status: "Quotation Pending" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: 3 }, { overall_status: "IT Review" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: 4 }, { overall_status: "HOD Approval Pending" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: 5 }, { overall_status: "GM Approval Pending" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: 6 }, { overall_status: "PO Created" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: 7 }, { overall_status: "Goods Received" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: { $in: [8, 9] } }, { overall_status: "Invoice Verification" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: 10 }, { overall_status: "Payment Pending" }],
      }),
      ProcurementRequest.countDocuments({
        $or: [{ current_stage: { $in: [11, 12] } }, { overall_status: "Completed" }],
      }),
      ProcurementRequest.countDocuments({ overall_status: "Rejected" }),
      ProcurementRequest.countDocuments({ overall_status: "Returned" }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        quotationPending,
        itReview,
        hodPending,
        gmPending,
        poCreated,
        goodsReceived,
        invoiceVerification,
        paymentPending,
        completed,
        rejected,
        returned,
      },
    });
  } catch (err) {
    logger.error(`Procurement stats error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. GET NEXT PR NUMBER ───────────────────────────────────────────────────
router.get("/next-pr", async (req, res) => {
  try {
    const nextPr = await generateNextPRNumber();
    res.json({ success: true, next_pr_number: nextPr });
  } catch (err) {
    logger.error(`Error generating next PR number: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. UPLOAD PROCUREMENT DOCUMENT ───────────────────────────────────────────
router.post("/upload-doc", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      logger.error(`Procurement document upload error: ${err.message}`);
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const host = req.get("host") || "localhost:9006";
    const protocol = req.protocol || "http";
    const baseUrl = `${protocol}://${host}`;
    const fileUrl = `${baseUrl}/uploads/it-helpdesk/procurement/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// ── 4. GET ALL PROCUREMENT REQUESTS (PAGINATED & FILTERED) ───────────────────
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      const s = String(req.query.search).trim();
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escaped, "i");
      query.$or = [
        { pr_number: rx },
        { "item_details.item_name": rx },
        { "requested_by.name": rx },
        { "requested_by.department": rx },
        { "purchase_order.po_number": rx },
        { "invoice_details.invoice_number": rx },
        { "final_approval.selected_vendor": rx },
      ];
    }

    if (req.query.branch && req.query.branch !== "All") {
      query.branch = req.query.branch;
    }

    if (req.query.status && req.query.status !== "All") {
      query.overall_status = req.query.status;
    }

    if (req.query.stage && req.query.stage !== "All") {
      const stageNum = parseInt(req.query.stage, 10);
      if (!isNaN(stageNum)) {
        query.current_stage = stageNum;
      }
    }

    if (req.query.category && req.query.category !== "All") {
      query["item_details.category"] = req.query.category;
    }

    const [items, total] = await Promise.all([
      ProcurementRequest.find(query)
        .populate("quotations.vendor_id", "name contact_person mobile_number email")
        .populate("asset_bridge.asset_id", "asset_tag asset_name lifecycle_status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProcurementRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    logger.error(`Get procurement requests error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. GET SINGLE PROCUREMENT REQUEST BY ID ──────────────────────────────────
router.get("/:id", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id)
      .populate("quotations.vendor_id")
      .populate("asset_bridge.asset_id")
      .populate("requested_by.id", "name username email department designation")
      .populate("assignment_handover.assigned_to", "name username email department");

    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    // Auto-populate vendor GSTIN from Vendor Management module if missing
    if (!item.invoice_details?.gstin) {
      const vName =
        item.invoice_details?.vendor_name ||
        item.final_approval?.selected_vendor ||
        item.purchase_order?.vendor_name ||
        item.it_evaluation?.recommended_vendor ||
        item.quotations?.find((q) => q.is_selected_by_gm || q.is_recommended_by_it)?.vendor_name ||
        item.quotations?.[0]?.vendor_name ||
        "";
      if (vName) {
        const vMatch = await ItVendor.findOne({ name: new RegExp(`^${vName}$`, "i") }).select("gst_number _id name");
        if (vMatch) {
          if (!item.invoice_details) item.invoice_details = {};
          if (vMatch.gst_number) item.invoice_details.gstin = vMatch.gst_number;
          if (!item.invoice_details.vendor_name) item.invoice_details.vendor_name = vMatch.name || vName;
          if (!item.invoice_details.vendor_id) item.invoice_details.vendor_id = vMatch._id;
        }
      }
    }

    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Get single procurement error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. CREATE NEW PURCHASE REQUEST (STAGE 1) ──────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const prNumber = body.pr_number || (await generateNextPRNumber());

    const requester = {
      id: req.user?._id || null,
      name: body.requested_by?.name || req.user?.name || req.user?.username || "Requester",
      email: body.requested_by?.email || req.user?.email || "",
      department: body.requested_by?.department || req.user?.department || "IT",
    };

    const hasQuotations = Array.isArray(body.quotations) && body.quotations.length > 0;
    const initialStage = hasQuotations ? (body.quotations.length >= 3 ? 3 : 2) : 1;
    const initialStatus = hasQuotations
      ? body.quotations.length >= 3
        ? "IT Review"
        : "Quotation Pending"
      : body.overall_status === "Draft"
      ? "Draft"
      : "Quotation Pending";

    const newRequest = new ProcurementRequest({
      pr_number: prNumber,
      request_date: body.request_date || new Date(),
      required_by_date: body.required_by_date || null,
      requested_by: requester,
      branch: body.branch || "Head Office",
      item_details: {
        item_name: body.item_details?.item_name || body.item_name || "IT Hardware",
        category: body.item_details?.category || body.category || "Computer / Desktop",
        quantity: parseInt(body.item_details?.quantity || body.quantity, 10) || 1,
        estimated_budget: parseFloat(body.item_details?.estimated_budget || body.estimated_budget) || 0,
        budget_head: body.item_details?.budget_head || "IT CapEx",
        priority: body.item_details?.priority || "Normal",
        justification: body.item_details?.justification || body.justification || "",
        specifications: body.item_details?.specifications || {},
      },
      quotations: Array.isArray(body.quotations) ? body.quotations : [],
      current_stage: initialStage,
      overall_status: initialStatus,
      workflow_history: [
        {
          stage: 1,
          action: "Purchase Request Created",
          performed_by: req.user?.name || req.user?.username || "Requester",
          performed_by_id: req.user?._id || null,
          role: req.user?.role || "Staff",
          timestamp: new Date(),
          remarks: body.item_details?.justification || "Purchase request submitted into workflow",
        },
      ],
    });

    await newRequest.save();

    logger.info(`Procurement Request created: ${prNumber} by ${req.user?.username}`);
    res.status(201).json({ success: true, data: newRequest });
  } catch (err) {
    logger.error(`Create PR error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7. UPDATE GENERAL / DRAFT PR DETAILS ─────────────────────────────────────
router.put("/:id", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const body = req.body;
    if (body.branch) item.branch = body.branch;
    if (body.required_by_date) item.required_by_date = body.required_by_date;
    if (body.item_details) {
      item.item_details = { ...item.item_details.toObject(), ...body.item_details };
    }

    item.workflow_history.push({
      stage: item.current_stage,
      action: "Request Details Updated",
      performed_by: req.user?.name || req.user?.username || "User",
      performed_by_id: req.user?._id || null,
      role: req.user?.role || "Staff",
      timestamp: new Date(),
      remarks: body.remarks || "Updated request specifications/budget",
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Update PR error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 8. STAGE 2: UPLOAD & UPDATE VENDOR QUOTATIONS ─────────────────────────────
router.post("/:id/quotations", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const { quotations, comparison_notes } = req.body;
    if (!Array.isArray(quotations) || quotations.length === 0) {
      return res.status(400).json({ success: false, message: "Quotations array is required" });
    }

    item.quotations = quotations.map((q) => ({
      quotation_no: q.quotation_no || "",
      vendor_id: q.vendor_id || null,
      vendor_name: q.vendor_name || "",
      total_amount: parseFloat(q.total_amount) || 0,
      warranty_period: q.warranty_period || "1 Year",
      delivery_days: parseInt(q.delivery_days, 10) || 7,
      payment_terms: q.payment_terms || "30 Days Credit",
      file_url: q.file_url || "",
      uploaded_at: q.uploaded_at || new Date(),
      is_recommended_by_it: Boolean(item.it_evaluation?.recommended_quote_no ? q.quotation_no === item.it_evaluation.recommended_quote_no : q.is_recommended_by_it),
      is_selected_by_gm: Boolean(q.is_selected_by_gm),
      notes: q.notes || "",
    }));

    if (item.quotations.length >= 3) {
      item.current_stage = Math.max(item.current_stage, 3);
      item.overall_status = "IT Review";
    } else {
      item.current_stage = Math.max(item.current_stage, 2);
      item.overall_status = "Quotation Pending";
    }

    item.workflow_history.push({
      stage: 2,
      action: "Quotations Uploaded & Updated",
      performed_by: req.user?.name || req.user?.username || "IT Engineer",
      performed_by_id: req.user?._id || null,
      role: req.user?.role || "IT",
      timestamp: new Date(),
      remarks: comparison_notes || `${item.quotations.length} quotations submitted for evaluation`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Upload quotations error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 9. STAGE 3: IT TECHNICAL EVALUATION ──────────────────────────────────────
router.post("/:id/it-evaluate", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const { decision, recommended_vendor, recommended_quote_no, remarks } = req.body;
    if (!decision) {
      return res.status(400).json({ success: false, message: "Evaluation decision is required" });
    }

    item.it_evaluation = {
      evaluated_by: req.user?.name || req.user?.username || "IT Engineer",
      evaluated_by_id: req.user?._id || null,
      evaluated_at: new Date(),
      decision,
      recommended_vendor: recommended_vendor || "",
      recommended_quote_no: recommended_quote_no || "",
      remarks: remarks || "",
    };

    // Mark recommended quotation flag and sync quotations if provided
    if (Array.isArray(req.body.quotations) && req.body.quotations.length > 0) {
      item.quotations = req.body.quotations.map((q, idx) => ({
        quotation_no: q.quotation_no || `QTN-00${idx + 1}`,
        vendor_name: q.vendor_name || "",
        vendor_id: (q.vendor_id && q.vendor_id._id) ? q.vendor_id._id : (q.vendor_id || null),
        total_amount: parseFloat(q.total_amount) || 0,
        warranty_period: q.warranty_period || "1 Year",
        delivery_days: parseInt(q.delivery_days, 10) || 7,
        payment_terms: q.payment_terms || "30 Days Credit",
        file_url: q.file_url || "",
        notes: q.notes || "",
        is_recommended_by_it: Boolean(recommended_quote_no && q.quotation_no === recommended_quote_no),
        is_selected_by_gm: Boolean(q.is_selected_by_gm),
      }));
    } else {
      item.quotations.forEach((q) => {
        q.is_recommended_by_it = Boolean(recommended_quote_no && q.quotation_no === recommended_quote_no);
      });
    }

    if (decision === "Approved") {
      item.current_stage = Math.max(item.current_stage, 4);
      item.overall_status = "HOD Approval Pending";
    } else if (decision === "Rejected") {
      item.overall_status = "Rejected";
    } else if (decision === "Clarification Required") {
      item.overall_status = "Returned";
      item.current_stage = 2;
    }

    item.workflow_history.push({
      stage: 3,
      action: `IT Technical Evaluation: ${decision}`,
      performed_by: req.user?.name || req.user?.username || "IT Engineer",
      performed_by_id: req.user?._id || null,
      role: "IT Technical Reviewer",
      timestamp: new Date(),
      remarks: remarks || `Decision: ${decision}, Recommended Quote: ${recommended_quote_no || "N/A"}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`IT Evaluate error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 10. STAGE 4: HOD / ADMIN APPROVAL (SHALINI ARUN) ─────────────────────────
router.post("/:id/approve-hod", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const { decision, approved_amount, remarks } = req.body;
    if (!decision) {
      return res.status(400).json({ success: false, message: "Decision is required" });
    }

    const approverName = req.user?.name || "Shalini Arun";
    const approverUsername = String(req.user?.username || "shalini_arun").toLowerCase();

    item.first_approval = {
      approver_username: approverUsername,
      approver_name: approverName,
      approver_id: req.user?._id || null,
      decision,
      approved_amount: parseFloat(approved_amount) || item.item_details.estimated_budget || 0,
      approval_date: new Date(),
      remarks: remarks || "",
    };

    if (decision === "Approved") {
      item.current_stage = Math.max(item.current_stage, 5);
      item.overall_status = "GM Approval Pending";
    } else if (decision === "Rejected") {
      item.overall_status = "Rejected";
    } else if (decision === "Returned") {
      item.overall_status = "Returned";
      item.current_stage = 3;
    }

    item.workflow_history.push({
      stage: 4,
      action: `HOD / Admin Decision: ${decision}`,
      performed_by: approverName,
      performed_by_id: req.user?._id || null,
      role: "HOD / Admin",
      timestamp: new Date(),
      remarks: remarks || `Approved Amount: ₹${approved_amount || "0"}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`HOD Approve error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 11. STAGE 5: GM / MANAGEMENT APPROVAL (MANU PILLAI) ──────────────────────
router.post("/:id/approve-gm", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const {
      decision,
      selected_vendor,
      selected_vendor_id,
      selected_quote_no,
      final_approved_amount,
      remarks,
    } = req.body;

    if (!decision) {
      return res.status(400).json({ success: false, message: "Decision is required" });
    }

    const approverName = req.user?.name || "Manu Pillai";
    const approverUsername = String(req.user?.username || "manu_pillai").toLowerCase();

    // Mark winner quote
    if (selected_quote_no) {
      item.quotations.forEach((q) => {
        q.is_selected_by_gm = q.quotation_no === selected_quote_no;
      });
    }

    item.final_approval = {
      approver_username: approverUsername,
      approver_name: approverName,
      approver_id: req.user?._id || null,
      decision,
      selected_vendor: selected_vendor || "",
      selected_vendor_id: selected_vendor_id || null,
      selected_quote_no: selected_quote_no || "",
      final_approved_amount: parseFloat(final_approved_amount) || item.first_approval.approved_amount || 0,
      approval_date: new Date(),
      remarks: remarks || "",
    };

    if (decision === "Approved") {
      item.current_stage = Math.max(item.current_stage, 6);
      item.overall_status = "PO Created";
    } else if (decision === "Rejected") {
      item.overall_status = "Rejected";
    } else if (decision === "Returned") {
      item.overall_status = "Returned";
      item.current_stage = 4;
    }

    item.workflow_history.push({
      stage: 5,
      action: `GM / Management Decision: ${decision}`,
      performed_by: approverName,
      performed_by_id: req.user?._id || null,
      role: "General Manager",
      timestamp: new Date(),
      remarks:
        remarks ||
        `Selected Vendor: ${selected_vendor || "N/A"}, Final Approved: ₹${final_approved_amount || "0"}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`GM Approve error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 12. STAGE 6: PURCHASE ORDER (PO) ─────────────────────────────────────────
router.post("/:id/po", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const { po_number, po_date, po_amount, po_file_url, expected_delivery, notes } = req.body;
    if (!po_number) {
      return res.status(400).json({ success: false, message: "PO Number is required" });
    }

    item.purchase_order = {
      po_number,
      po_date: po_date || new Date(),
      po_amount: parseFloat(po_amount) || item.final_approval.final_approved_amount || 0,
      po_file_url: po_file_url || "",
      expected_delivery: expected_delivery || null,
      created_by: req.user?.name || req.user?.username || "Purchasing Team",
      notes: notes || "",
    };

    item.current_stage = Math.max(item.current_stage, 7);
    item.overall_status = "Goods Received";

    item.workflow_history.push({
      stage: 6,
      action: `Purchase Order Issued: ${po_number}`,
      performed_by: req.user?.name || req.user?.username || "Purchasing Team",
      performed_by_id: req.user?._id || null,
      role: "Procurement",
      timestamp: new Date(),
      remarks: `PO Amount: ₹${item.purchase_order.po_amount}, Delivery Expected: ${expected_delivery || "N/A"}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Create PO error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 13. STAGE 7: RECEIVING & GRN ─────────────────────────────────────────────
router.post("/:id/grn", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const {
      grn_number,
      received_date,
      received_qty,
      serial_numbers,
      delivery_challan_url,
      inspection_status,
      receipt_status,
      remarks,
    } = req.body;

    item.grn_receiving = {
      grn_number: grn_number || `GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      received_date: received_date || new Date(),
      received_qty: parseInt(received_qty, 10) || item.item_details.quantity || 1,
      serial_numbers: Array.isArray(serial_numbers) ? serial_numbers.filter(Boolean) : [],
      delivery_challan_url: delivery_challan_url || "",
      inspection_status: inspection_status || "Accepted",
      receipt_status: receipt_status || "Received",
      received_by: req.user?.name || req.user?.username || "IT Stores",
      remarks: remarks || "",
    };

    item.current_stage = Math.max(item.current_stage, 8);
    item.overall_status = "Invoice Verification";

    item.workflow_history.push({
      stage: 7,
      action: `Goods Received: GRN ${item.grn_receiving.grn_number}`,
      performed_by: req.user?.name || req.user?.username || "IT Stores",
      performed_by_id: req.user?._id || null,
      role: "Store / Receiver",
      timestamp: new Date(),
      remarks: `Received Qty: ${item.grn_receiving.received_qty}, Inspection: ${item.grn_receiving.inspection_status}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Record GRN error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 14. STAGE 8 & 9: TAX INVOICE & ACCOUNTS 3-WAY MATCHING ────────────────────
router.post("/:id/invoice-verify", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const {
      vendor_name,
      vendor_id,
      invoice_number,
      invoice_date,
      gstin,
      invoice_amount,
      invoice_url,
      po_verified,
      grn_verified,
      verification_status,
      accounts_remarks,
    } = req.body;

    const poAmt = item.purchase_order?.po_amount || 0;
    const invAmt = parseFloat(invoice_amount) || 0;
    const isAmountMatch = Math.abs(poAmt - invAmt) < 1;

    let resolvedGstin = (gstin || "").trim();
    const resolvedVendorName = (vendor_name || item.invoice_details?.vendor_name || item.final_approval?.selected_vendor || item.purchase_order?.vendor_name || "").trim();
    let resolvedVendorId = vendor_id || item.invoice_details?.vendor_id || item.final_approval?.selected_vendor_id || null;

    if (!resolvedGstin && (resolvedVendorName || resolvedVendorId)) {
      const vMatch = resolvedVendorId
        ? await ItVendor.findById(resolvedVendorId).select("gst_number _id name")
        : await ItVendor.findOne({ name: new RegExp(`^${resolvedVendorName}$`, "i") }).select("gst_number _id name");
      if (vMatch) {
        resolvedGstin = vMatch.gst_number || "";
        resolvedVendorId = vMatch._id;
      }
    }

    item.invoice_details = {
      vendor_name: resolvedVendorName,
      vendor_id: resolvedVendorId,
      invoice_number: invoice_number || item.invoice_details?.invoice_number || "",
      invoice_date: invoice_date || new Date(),
      gstin: resolvedGstin,
      invoice_amount: invAmt,
      invoice_url: invoice_url || item.invoice_details?.invoice_url || "",
      po_verified: Boolean(po_verified),
      grn_verified: Boolean(grn_verified),
      accounts_verified_by: req.user?.name || req.user?.username || "Accounts Team",
      accounts_verified_date: new Date(),
      verification_status: verification_status || (isAmountMatch ? "Verified" : "Mismatch"),
      accounts_remarks: accounts_remarks || "",
    };

    if (item.invoice_details.verification_status === "Verified") {
      item.current_stage = Math.max(item.current_stage, 10);
      item.overall_status = "Payment Pending";
    }

    item.workflow_history.push({
      stage: 9,
      action: `Accounts 3-Way Verification: ${item.invoice_details.verification_status}`,
      performed_by: req.user?.name || req.user?.username || "Accounts Team",
      performed_by_id: req.user?._id || null,
      role: "Accounts",
      timestamp: new Date(),
      remarks:
        accounts_remarks ||
        `PO: ₹${poAmt} | Invoice: ₹${invAmt} | GRN Qty: ${item.grn_receiving?.received_qty || 0}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Invoice verify error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 15. STAGE 10: PAYMENT & UTR ──────────────────────────────────────────────
router.post("/:id/payment", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const {
      payment_status,
      payment_mode,
      paid_amount,
      payment_date,
      utr_number,
      payment_proof_url,
      closure_remarks,
    } = req.body;

    item.payment_details = {
      payment_status: payment_status || "Processed",
      payment_mode: payment_mode || "Bank Transfer",
      paid_amount: parseFloat(paid_amount) || item.invoice_details?.invoice_amount || item.final_approval.final_approved_amount || 0,
      payment_date: payment_date || new Date(),
      utr_number: utr_number || "",
      payment_proof_url: payment_proof_url || "",
      accounts_manager: req.user?.name || req.user?.username || "Accounts Manager",
      closure_remarks: closure_remarks || "",
    };

    if (item.payment_details.payment_status === "Processed") {
      item.current_stage = Math.max(item.current_stage, 11);
    }

    item.workflow_history.push({
      stage: 10,
      action: `Payment Processed: UTR ${utr_number || "N/A"}`,
      performed_by: req.user?.name || req.user?.username || "Accounts Team",
      performed_by_id: req.user?._id || null,
      role: "Finance / Accounts",
      timestamp: new Date(),
      remarks: `Paid ₹${item.payment_details.paid_amount} via ${item.payment_details.payment_mode}. UTR: ${utr_number || "N/A"}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Payment record error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 16. STAGE 11: AUTOMATED ASSET REGISTRATION BRIDGE ────────────────────────
router.post("/:id/convert-to-asset", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    // Check if already registered
    if (item.asset_bridge?.is_registered && item.asset_bridge?.asset_id) {
      const existing = await ITUnifiedAsset.findById(item.asset_bridge.asset_id);
      if (existing) {
        return res.json({
          success: true,
          message: "Asset is already registered in Unified Hub",
          asset: existing,
          data: item,
        });
      }
    }

    // Determine serial number
    const serial =
      (item.grn_receiving?.serial_numbers && item.grn_receiving.serial_numbers[0]) ||
      req.body.serial_number ||
      "";

    // Determine vendor ObjectId
    let vendorId = item.final_approval?.selected_vendor_id || null;
    let vendorName = item.final_approval?.selected_vendor || "";

    if (!vendorId && vendorName) {
      const v = await ItVendor.findOne({ name: new RegExp(`^${vendorName.trim()}$`, "i") });
      if (v) vendorId = v._id;
    }

    // Generate unique Asset Tag
    const assetTag = req.body.asset_tag || (await generateNextAssetTag());

    // Calculate 1 or 3 year warranty end date from receiving date
    const purchaseDate = item.payment_details?.payment_date || item.grn_receiving?.received_date || new Date();
    const warrantyStart = item.grn_receiving?.received_date || purchaseDate;
    const warrantyEnd = new Date(warrantyStart);
    warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);

    // Create record in Unified Asset Model
    const newAsset = new ITUnifiedAsset({
      asset_tag: assetTag,
      asset_name: req.body.asset_name || item.item_details.item_name,
      category: req.body.category || item.item_details.category || "Computer / Desktop",
      brand: req.body.brand || "Brand",
      model: req.body.model || item.item_details.item_name,
      serial_number: serial,
      lifecycle_status: "Available",
      inventory_type: "New Inventory",
      stock_type: "New",
      condition: "Good",
      department: item.requested_by?.department || "IT",
      location: item.branch || "Head Office",
      vendor: vendorId,
      vendor_name: vendorName,
      purchase_cost: item.payment_details?.paid_amount || item.final_approval?.final_approved_amount || item.item_details.estimated_budget || 0,
      purchase_date: purchaseDate,
      invoice_number: item.invoice_details?.invoice_number || "",
      invoice_date: item.invoice_details?.invoice_date || null,
      invoice_url: item.invoice_details?.invoice_url || "",
      payment_mode: item.payment_details?.payment_mode || "Bank Transfer",
      warranty_start_date: warrantyStart,
      warranty_end_date: warrantyEnd,
      origin_source: "Procurement",
      procurement_id: item._id,
      procurement_ref: item.pr_number,
      specs: item.item_details.specifications || {},
      created_by: req.user?._id || null,
      created_by_name: req.user?.name || req.user?.username || "Procurement Module",
      approval_stage: "Completed",
      approval_status: "Approved - Verified via Procurement Workflow",
      workflow_history: [
        {
          stage: "Procurement Bridge",
          action: "Registered directly from Procurement Workflow",
          performed_by: req.user?._id || null,
          performed_by_name: req.user?.name || req.user?.username || "IT Admin",
          performed_by_role: "IT Admin",
          remarks: `Bridged from PR ${item.pr_number} with PO ${item.purchase_order?.po_number || "N/A"} and UTR ${item.payment_details?.utr_number || "N/A"}`,
          timestamp: new Date(),
        },
      ],
      history: [
        {
          action: "Auto-Created from Procurement Workflow",
          changed_by: req.user?._id || null,
          changed_by_name: req.user?.name || req.user?.username || "IT Admin",
          timestamp: new Date(),
          remarks: `Procurement ID: ${item.pr_number}`,
        },
      ],
    });

    await newAsset.save();

    // Link back to ProcurementRequest
    item.asset_bridge = {
      asset_id: newAsset._id,
      asset_tag: newAsset.asset_tag,
      is_registered: true,
      registered_at: new Date(),
      registered_by: req.user?.name || req.user?.username || "IT Admin",
    };

    item.current_stage = Math.max(item.current_stage, 11);
    if (!item.assignment_handover?.assigned_to) {
      item.overall_status = "Completed";
    }

    item.workflow_history.push({
      stage: 11,
      action: `Equipment Registered in Unified Hub: ${newAsset.asset_tag}`,
      performed_by: req.user?.name || req.user?.username || "IT Admin",
      performed_by_id: req.user?._id || null,
      role: "IT Asset Manager",
      timestamp: new Date(),
      remarks: `Unified Asset ID: ${newAsset._id}, Tag: ${newAsset.asset_tag}`,
    });

    await item.save();

    logger.info(`Procurement ${item.pr_number} converted to asset ${newAsset.asset_tag}`);
    res.json({
      success: true,
      message: `Asset ${newAsset.asset_tag} registered successfully in Unified Hub!`,
      asset: newAsset,
      data: item,
    });
  } catch (err) {
    logger.error(`Convert to asset error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 17. STAGE 12: ASSIGNMENT & HANDOVER ──────────────────────────────────────
router.post("/:id/handover", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    const {
      assigned_to,
      assigned_to_name,
      department,
      location,
      handover_date,
      warranty_end_date,
      remarks,
    } = req.body;

    item.assignment_handover = {
      assigned_to: assigned_to || null,
      assigned_to_name: assigned_to_name || "",
      department: department || item.requested_by.department || "",
      location: location || item.branch || "",
      handover_date: handover_date || new Date(),
      warranty_end_date: warranty_end_date || null,
      remarks: remarks || "",
    };

    item.current_stage = 12;
    item.overall_status = "Completed";

    // Also update bridged asset if exists
    if (item.asset_bridge?.asset_id) {
      const asset = await ITUnifiedAsset.findById(item.asset_bridge.asset_id);
      if (asset) {
        if (assigned_to) asset.assigned_to = assigned_to;
        if (assigned_to_name) asset.assigned_to_name = assigned_to_name;
        asset.assigned_date = handover_date || new Date();
        if (department) asset.department = department;
        if (location) asset.location = location;
        asset.lifecycle_status = "In Use";
        if (warranty_end_date) asset.warranty_end_date = warranty_end_date;

        asset.workflow_history.push({
          stage: "Handover",
          action: `Allocated to ${assigned_to_name || "Employee"}`,
          performed_by: req.user?._id || null,
          performed_by_name: req.user?.name || req.user?.username || "IT Admin",
          performed_by_role: "IT Admin",
          remarks: remarks || "Handover completed",
          timestamp: new Date(),
        });

        await asset.save();
      }
    }

    item.workflow_history.push({
      stage: 12,
      action: `Handover Completed to ${assigned_to_name || "Employee"}`,
      performed_by: req.user?.name || req.user?.username || "IT Admin",
      performed_by_id: req.user?._id || null,
      role: "IT Admin",
      timestamp: new Date(),
      remarks: remarks || `Allocated at ${location || "Location"}`,
    });

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Handover error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 18. DELETE PR ─────────────────────────────────────────────────────────────
router.delete("/:id", validateId, async (req, res) => {
  try {
    const item = await ProcurementRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Procurement request not found" });
    }

    // Protect requests that have already completed PO or Payment
    if (item.current_stage >= 6 && item.overall_status !== "Rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a procurement request that has already issued a Purchase Order or reached later stages.",
      });
    }

    await ProcurementRequest.findByIdAndDelete(req.params.id);
    logger.info(`Procurement Request ${item.pr_number} deleted by ${req.user?.username}`);
    res.json({ success: true, message: `Procurement request ${item.pr_number} deleted` });
  } catch (err) {
    logger.error(`Delete PR error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

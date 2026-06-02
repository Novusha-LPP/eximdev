import express from "express";
import mongoose from "mongoose";
import Scorecard from "../../model/scorecard/Scorecard.js";

const router = express.Router();

const DEFAULT_CRITERIA = [
  { srNo: 1,  criteria: "Response Time to Complaint",          weightage: 1 },
  { srNo: 2,  criteria: "Breakdown Resolution Time",           weightage: 1 },
  { srNo: 3,  criteria: "Preventive Maintenance Completion",   weightage: 1 },
  { srNo: 4,  criteria: "Quality of Service Work",             weightage: 1 },
  { srNo: 5,  criteria: "Technician Behaviour & Discipline",   weightage: 1 },
  { srNo: 6,  criteria: "Availability of Spare Parts",         weightage: 1 },
  { srNo: 7,  criteria: "Compliance with Safety Standards",    weightage: 1 },
  { srNo: 8,  criteria: "Documentation & Service Reports",     weightage: 1 },
  { srNo: 9,  criteria: "Adherence to AMC Schedule",           weightage: 1 },
  { srNo: 10, criteria: "Overall Support & Coordination",      weightage: 1 },
];

// Simple, robust custom validation middleware
const validateScorecard = (req, res, next) => {
  const { supplierName, evaluationItems } = req.body;
  const errors = [];

  if (!supplierName || typeof supplierName !== "string" || !supplierName.trim()) {
    errors.push({ msg: "Supplier name is required", path: "supplierName" });
  }

  if (!Array.isArray(evaluationItems) || evaluationItems.length === 0) {
    errors.push({ msg: "Evaluation items are required", path: "evaluationItems" });
  } else {
    evaluationItems.forEach((item, index) => {
      const rating = parseFloat(item.rating);
      if (isNaN(rating) || rating < 0 || rating > 10) {
        errors.push({
          msg: "Rating must be between 0 and 10",
          path: `evaluationItems[${index}].rating`,
        });
      }
    });
  }

  if (errors.length > 0) {
    return res.status(422).json({ success: false, errors });
  }
  next();
};

const validateId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(422).json({
      success: false,
      errors: [{ msg: "Invalid scorecard ID", path: "id" }],
    });
  }
  next();
};

const validateStatus = (req, res, next) => {
  const { status } = req.body;
  if (!["Draft", "Submitted", "Approved"].includes(status)) {
    return res.status(422).json({
      success: false,
      errors: [{ msg: "Invalid status", path: "status" }],
    });
  }
  next();
};

// ─── GET /api/scorecards ───────────────────────────────────────────────────
// List all scorecards (summary view)
router.get("/", async (req, res) => {
  try {
    const { branch, status, supplierName, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (branch && branch !== "All Branches") filter.branch = branch;
    if (status) filter.status = status;
    if (supplierName) filter.supplierName = new RegExp(supplierName, "i");

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Scorecard.find(filter)
        .select("-evaluationItems -complaints")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Scorecard.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/scorecards/template ─────────────────────────────────────────
// Return blank template with default criteria
router.get("/template", (_req, res) => {
  res.json({
    success: true,
    data: {
      evaluationItems: DEFAULT_CRITERIA.map((c) => ({ ...c, rating: 0, score: 0 })),
    },
  });
});

// ─── GET /api/scorecards/stats/summary ────────────────────────────────────
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Scorecard.aggregate([
      {
        $group: {
          _id: "$overallRating",
          count: { $sum: 1 },
          avgScore: { $avg: "$percentage" },
        },
      },
    ]);
    const total = await Scorecard.countDocuments();
    res.json({ success: true, data: { total, breakdown: stats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/scorecards/:id ───────────────────────────────────────────────
router.get(
  "/:id",
  validateId,
  async (req, res) => {
    try {
      const doc = await Scorecard.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Scorecard not found" });
      res.json({ success: true, data: doc });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── POST /api/scorecards ──────────────────────────────────────────────────
// Create new scorecard
router.post(
  "/",
  validateScorecard,
  async (req, res) => {
    try {
      const scorecard = new Scorecard({
        supplierName:     req.body.supplierName,
        serviceType:      req.body.serviceType,
        evaluationPeriod: req.body.evaluationPeriod,
        evaluatedBy:      req.body.evaluatedBy,
        branch:           req.body.branch || "All Branches",
        date:             req.body.date || new Date(),
        evaluationItems:  req.body.evaluationItems,
        complaints:       req.body.complaints || [],
        overallRemarks:   req.body.overallRemarks || "",
        status:           req.body.status || "Draft",
      });

      await scorecard.save();
      res.status(201).json({ success: true, data: scorecard });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PUT /api/scorecards/:id ───────────────────────────────────────────────
// Update scorecard
router.put(
  "/:id",
  validateId,
  async (req, res) => {
    try {
      const doc = await Scorecard.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Scorecard not found" });

      const allowed = [
        "supplierName", "serviceType", "evaluationPeriod", "evaluatedBy",
        "branch", "date", "evaluationItems", "complaints", "overallRemarks", "status",
      ];
      allowed.forEach((k) => { if (req.body[k] !== undefined) doc[k] = req.body[k]; });

      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── PATCH /api/scorecards/:id/status ─────────────────────────────────────
router.patch(
  "/:id/status",
  validateId,
  validateStatus,
  async (req, res) => {
    try {
      const doc = await Scorecard.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: "Scorecard not found" });
      res.json({ success: true, data: { _id: doc._id, status: doc.status } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── DELETE /api/scorecards/:id ────────────────────────────────────────────
router.delete(
  "/:id",
  validateId,
  async (req, res) => {
    try {
      const doc = await Scorecard.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Scorecard not found" });
      res.json({ success: true, message: "Scorecard deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;

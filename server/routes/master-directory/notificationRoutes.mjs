import express from "express";
import ItemDutyNotificationModel from "../../model/notifications/itemDutyNotificationModel.mjs";
import OtherDutiesNotificationModel from "../../model/notifications/otherDutiesNotificationModel.mjs";
import OtherDutiesANotificationModel from "../../model/notifications/otherDutiesANotificationModel.mjs";
import JobModel from "../../model/jobModel.mjs";
import {
  harvestPartIIIDuties,
  normalizeNotnNo,
  normalizeSrNo,
  parseRate,
  extractCandidateBoeUrlsFromJob,
  runOcrOnBoeFileUrl,
  startBackgroundSync,
  getActiveSyncProgress,
  cancelActiveSync
} from "../../services/notificationHarvestService.mjs";
import logger from "../../logger.js";

const router = express.Router();

const getModelForSection = (section) => {
  const s = String(section).toLowerCase().trim();
  if (s === "b" || s === "section-b" || s === "item-duty") return ItemDutyNotificationModel;
  if (s === "c" || s === "section-c" || s === "other-duties") return OtherDutiesNotificationModel;
  if (s === "d" || s === "section-d" || s === "other-duties-a") return OtherDutiesANotificationModel;
  return null;
};

// ─── 1. STATIC ROUTES (MUST BE BEFORE PARAMETERIZED /:section ROUTES) ──────────

// Overall stats across all 3 sections
router.get("/api/notifications/overall/stats", async (req, res) => {
  try {
    const [bTotal, bVariances, cTotal, cVariances, dTotal, dVariances] = await Promise.all([
      ItemDutyNotificationModel.countDocuments({ is_active: true }),
      ItemDutyNotificationModel.countDocuments({ is_active: true, has_rate_variance: true }),
      OtherDutiesNotificationModel.countDocuments({ is_active: true }),
      OtherDutiesNotificationModel.countDocuments({ is_active: true, has_rate_variance: true }),
      OtherDutiesANotificationModel.countDocuments({ is_active: true }),
      OtherDutiesANotificationModel.countDocuments({ is_active: true, has_rate_variance: true })
    ]);

    return res.json({
      success: true,
      data: {
        totalRules: bTotal + cTotal + dTotal,
        totalVariances: bVariances + cVariances + dVariances,
        sectionB: { count: bTotal, variances: bVariances },
        sectionC: { count: cTotal, variances: cVariances },
        sectionD: { count: dTotal, variances: dVariances }
      }
    });
  } catch (error) {
    logger.error("Error fetching overall notification stats:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Sync overview statistics across jobs & documents (with Year filtering support)
router.get("/api/notifications/sync/overview", async (req, res) => {
  try {
    const selectedYear = req.query.year;
    const baseQuery = {};
    if (selectedYear && selectedYear !== "ALL") {
      baseQuery.year = selectedYear;
    }

    const [
      allDistinctYears,
      totalJobs,
      jobsWithDuties,
      jobsWithBoeFiles,
      bCount,
      cCount,
      dCount
    ] = await Promise.all([
      JobModel.distinct("year"),
      JobModel.countDocuments(baseQuery),
      JobModel.countDocuments({
        ...baseQuery,
        $or: [
          { "PartIIIDuties.0": { $exists: true } },
          { "part_iii_duties.0": { $exists: true } }
        ]
      }),
      JobModel.countDocuments({
        ...baseQuery,
        $or: [
          { "processed_be_attachment.0": { $exists: true } },
          { "be_copy.0": { $exists: true } },
          { "ex_be_copy_documents.0": { $exists: true } },
          { "in_bond_be_copy.0": { $exists: true } },
          { "checklist.0": { $exists: true } }
        ]
      }),
      ItemDutyNotificationModel.countDocuments({ is_active: true }),
      OtherDutiesNotificationModel.countDocuments({ is_active: true }),
      OtherDutiesANotificationModel.countDocuments({ is_active: true })
    ]);

    // Clean and sort years descending
    const availableYears = allDistinctYears
      .filter((y) => y && String(y).trim() !== "" && String(y).toLowerCase() !== "null")
      .sort((a, b) => String(b).localeCompare(String(a)));

    return res.json({
      success: true,
      data: {
        totalJobs,
        jobsWithExtractedDuties: jobsWithDuties,
        jobsWithAttachedBoeFiles: jobsWithBoeFiles,
        totalHarvestedRules: bCount + cCount + dCount,
        sectionBCount: bCount,
        sectionCCount: cCount,
        sectionDCount: dCount,
        availableYears
      }
    });
  } catch (error) {
    logger.error("Error fetching sync overview:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Live Progress of Background Master Data Sync
router.get("/api/notifications/sync/progress", (req, res) => {
  const progress = getActiveSyncProgress();
  return res.json({ success: true, data: progress });
});

// Cancel Background Master Data Sync
router.post("/api/notifications/sync/cancel", (req, res) => {
  const result = cancelActiveSync();
  return res.json(result);
});

// Start Background Master Data Sync (Non-blocking: prevents HTTP timeouts on 20,000+ jobs)
router.post("/api/notifications/sync/start", async (req, res) => {
  try {
    const { mode = "FAST_DUTIES_SYNC", year = "ALL", batchLimit = "ALL" } = req.body;
    const result = await startBackgroundSync({ mode, year, batchLimit });
    return res.json(result);
  } catch (error) {
    logger.error("Error starting master sync:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Alias for start
router.post("/api/notifications/sync/execute", async (req, res) => {
  try {
    const { mode = "FAST_DUTIES_SYNC", year = "ALL", batchLimit = "ALL" } = req.body;
    const result = await startBackgroundSync({ mode, year, batchLimit });
    return res.json(result);
  } catch (error) {
    logger.error("Error starting master sync:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Batch Seed & Harvest from all existing Jobs in Database (legacy alias)
router.post("/api/notifications/seed-from-jobs", async (req, res) => {
  try {
    const result = await startBackgroundSync({ mode: "FAST_DUTIES_SYNC", year: "ALL", batchLimit: "ALL" });
    return res.json(result);
  } catch (error) {
    logger.error("Error seeding notification directories from jobs:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── 2. PARAMETERIZED SECTION ROUTES ──────────────────────────────────────────

// List notifications for a specific section
router.get("/api/notifications/:section", async (req, res) => {
  try {
    const Model = getModelForSection(req.params.section);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid section. Must be 'b', 'c', or 'd'." });
    }

    const { search = "", dutyHead = "", varianceStatus = "", page = 1, limit = 50 } = req.query;
    const query = { is_active: true };

    if (dutyHead && dutyHead !== "ALL") {
      query.duty_head = dutyHead.toUpperCase().trim();
    }

    if (varianceStatus && varianceStatus !== "ALL") {
      if (varianceStatus === "HAS_VARIANCE") {
        query.has_rate_variance = true;
      } else {
        query.variance_status = varianceStatus;
      }
    }

    if (search && search.trim() !== "") {
      const s = search.trim();
      query.$or = [
        { notn_no: { $regex: s, $options: "i" } },
        { notn_sno: { $regex: s, $options: "i" } },
        { duty_head: { $regex: s, $options: "i" } },
        { cth_code: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Model.find(query).sort({ usage_count: -1, updatedAt: -1 }).skip(skip).limit(limitNum).lean(),
      Model.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error("Error fetching notifications list:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Add manual notification
router.post("/api/notifications/:section", async (req, res) => {
  try {
    const Model = getModelForSection(req.params.section);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid section. Must be 'b', 'c', or 'd'." });
    }

    const {
      notn_no,
      notn_sno,
      duty_head,
      cth_code = "ALL",
      current_rate = 0,
      rate_type = "PERCENTAGE",
      unit = "%",
      current_duty_flag = "",
      description = "",
      coo = "ALL",
      compliance_tags = []
    } = req.body;

    if (!notn_no || !duty_head) {
      return res.status(400).json({ success: false, message: "Notification No and Duty Head are required." });
    }

    const cleanNotnNo = normalizeNotnNo(notn_no);
    const cleanSrNo = normalizeSrNo(notn_sno);
    const numRate = parseRate(current_rate);

    const existing = await Model.findOne({
      notn_no: cleanNotnNo,
      notn_sno: cleanSrNo,
      duty_head: duty_head.toUpperCase().trim(),
      cth_code: cth_code.trim() || "ALL"
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Notification ${cleanNotnNo} (Sr: ${cleanSrNo}) for ${duty_head} already exists in master directory.`
      });
    }

    const created = await Model.create({
      notn_no: cleanNotnNo,
      notn_sno: cleanSrNo,
      duty_head: duty_head.toUpperCase().trim(),
      cth_code: cth_code.trim() || "ALL",
      current_rate: numRate,
      rate_type,
      unit,
      current_duty_flag,
      description,
      coo,
      compliance_tags: Array.isArray(compliance_tags) ? compliance_tags : [],
      rate_history: [
        {
          rate: numRate,
          rate_type,
          unit,
          duty_flag: current_duty_flag,
          observed_from: new Date(),
          remarks: "Manually added via Master Directory"
        }
      ],
      has_rate_variance: false,
      variance_status: "STABLE",
      is_auto_harvested: false,
      is_active: true,
      usage_count: 0
    });

    return res.status(201).json({ success: true, message: "Notification created successfully", data: created });
  } catch (error) {
    logger.error("Error creating notification:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update an existing notification
router.put("/api/notifications/:section/:id", async (req, res) => {
  try {
    const Model = getModelForSection(req.params.section);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid section." });
    }

    const { id } = req.params;
    const {
      current_rate,
      rate_type,
      unit,
      current_duty_flag,
      description,
      coo,
      compliance_tags,
      variance_status,
      is_active
    } = req.body;

    const doc = await Model.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Notification record not found." });
    }

    if (current_rate !== undefined) {
      const numRate = parseRate(current_rate);
      if (Math.abs(doc.current_rate - numRate) > 0.001) {
        doc.rate_history.push({
          rate: numRate,
          rate_type: rate_type || doc.rate_type,
          unit: unit || doc.unit,
          duty_flag: current_duty_flag || doc.current_duty_flag,
          observed_from: new Date(),
          remarks: "Rate updated manually by user"
        });
        doc.current_rate = numRate;
      }
    }

    if (rate_type) doc.rate_type = rate_type;
    if (unit) doc.unit = unit;
    if (current_duty_flag !== undefined) doc.current_duty_flag = current_duty_flag;
    if (description !== undefined) doc.description = description;
    if (coo !== undefined) doc.coo = coo;
    if (compliance_tags !== undefined) doc.compliance_tags = compliance_tags;
    if (variance_status) {
      doc.variance_status = variance_status;
      if (variance_status === "AMENDED_VERIFIED" || variance_status === "STABLE") {
        doc.has_rate_variance = false;
      }
    }
    if (is_active !== undefined) doc.is_active = is_active;

    await doc.save();
    return res.json({ success: true, message: "Notification updated successfully", data: doc });
  } catch (error) {
    logger.error("Error updating notification:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Delete / Deactivate a notification
router.delete("/api/notifications/:section/:id", async (req, res) => {
  try {
    const Model = getModelForSection(req.params.section);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid section." });
    }

    const { id } = req.params;
    await Model.findByIdAndDelete(id);
    return res.json({ success: true, message: "Notification record deleted successfully." });
  } catch (error) {
    logger.error("Error deleting notification:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Resolve rate variance (accept latest, mark verified)
router.post("/api/notifications/:section/resolve-variance/:id", async (req, res) => {
  try {
    const Model = getModelForSection(req.params.section);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid section." });
    }

    const { id } = req.params;
    const { action = "VERIFY_AMENDMENT", activeRate, remarks = "" } = req.body;

    const doc = await Model.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Notification record not found." });
    }

    if (action === "VERIFY_AMENDMENT") {
      doc.variance_status = "AMENDED_VERIFIED";
      doc.has_rate_variance = false;
      if (activeRate !== undefined) {
        doc.current_rate = parseRate(activeRate);
      }
    } else if (action === "MARK_STABLE") {
      doc.variance_status = "STABLE";
      doc.has_rate_variance = false;
    }

    if (remarks && doc.rate_history.length > 0) {
      doc.rate_history[doc.rate_history.length - 1].remarks += ` | ${remarks}`;
    }

    await doc.save();
    return res.json({ success: true, message: "Variance resolved successfully", data: doc });
  } catch (error) {
    logger.error("Error resolving variance:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

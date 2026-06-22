import express from "express";
import mongoose from "mongoose";
import AmcVisitorLogModel from "../../model/amcVisitorLogModel.mjs";

const router = express.Router();

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid log ID" });
  }
  next();
};

// ─── GET /api/amc-visitor/logs ─────────────────────────────────────────────
router.get("/logs", async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { supplierCompany: new RegExp(search, "i") },
        { technicianName: new RegExp(search, "i") },
        { mobileNo: new RegExp(search, "i") },
        { purpose: new RegExp(search, "i") },
        { amcCategory: new RegExp(search, "i") },
        { departmentArea: new RegExp(search, "i") },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      AmcVisitorLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AmcVisitorLogModel.countDocuments(filter),
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

// ─── GET /api/amc-visitor/stats ────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const [total, active, completed] = await Promise.all([
      AmcVisitorLogModel.countDocuments(),
      AmcVisitorLogModel.countDocuments({ status: "Active" }),
      AmcVisitorLogModel.countDocuments({ status: "Checked Out" }),
    ]);
    res.json({ success: true, data: { total, active, completed } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/amc-visitor/active/:mobileNo ─────────────────────────────────
router.get("/active/:mobileNo", async (req, res) => {
  try {
    const activeLog = await AmcVisitorLogModel.findOne({
      mobileNo: req.params.mobileNo,
      status: "Active",
    }).sort({ createdAt: -1 });

    if (!activeLog) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found for this mobile number",
      });
    }

    res.json({ success: true, data: activeLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/amc-visitor/check-in ────────────────────────────────────────
router.post("/check-in", async (req, res) => {
  try {
    const { supplierCompany, technicianName, mobileNo, purpose, amcCategory, departmentArea } = req.body;

    if (!supplierCompany || !technicianName || !mobileNo || !purpose || !amcCategory || !departmentArea) {
      return res.status(422).json({
        success: false,
        message: "All fields are mandatory",
      });
    }

    // Check if they already have an active check-in
    const existing = await AmcVisitorLogModel.findOne({ mobileNo, status: "Active" });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Technician already checked-in. Please check-out first.",
      });
    }

    const log = new AmcVisitorLogModel({
      supplierCompany,
      technicianName,
      mobileNo,
      purpose,
      amcCategory,
      departmentArea,
      checkInTime: new Date(),
      status: "Active",
    });

    await log.save();
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/amc-visitor/check-out ───────────────────────────────────────
router.post("/check-out", async (req, res) => {
  try {
    const { mobileNo, workStatus, employeeApprovalName, remarks } = req.body;

    if (!mobileNo || !workStatus || !employeeApprovalName) {
      return res.status(422).json({
        success: false,
        message: "Mobile No, Work Status, and Employee Approval Name are required",
      });
    }

    const activeLog = await AmcVisitorLogModel.findOne({ mobileNo, status: "Active" });
    if (!activeLog) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found for this mobile number",
      });
    }

    activeLog.checkOutTime = new Date();
    activeLog.workStatus = workStatus;
    activeLog.employeeApprovalName = employeeApprovalName;
    activeLog.remarks = remarks;
    activeLog.status = "Checked Out";

    await activeLog.save();
    res.json({ success: true, data: activeLog, message: "Checked out successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/amc-visitor/logs/:id ─────────────────────────────────────────
router.put("/logs/:id", validateId, async (req, res) => {
  try {
    const log = await AmcVisitorLogModel.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: "Log not found" });

    const allowed = [
      "supplierCompany", "technicianName", "mobileNo", "purpose",
      "amcCategory", "departmentArea", "workStatus", "employeeApprovalName", "remarks",
      "status", "checkInTime", "checkOutTime"
    ];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) log[k] = req.body[k];
    });

    await log.save();
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/amc-visitor/logs/:id ──────────────────────────────────────
router.delete("/logs/:id", validateId, async (req, res) => {
  try {
    const log = await AmcVisitorLogModel.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: "Log not found" });
    res.json({ success: true, message: "Log entry deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

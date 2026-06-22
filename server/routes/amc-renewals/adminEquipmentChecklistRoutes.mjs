import express from "express";
import mongoose from "mongoose";
import AdminEquipmentChecklist from "../../model/adminEquipmentChecklistModel.mjs";

const router = express.Router();

// ─── GET /api/equipment-checklist ───────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { checkedBy: new RegExp(search, "i") },
        { "items.equipmentName": new RegExp(search, "i") },
        { "items.amcVendor": new RegExp(search, "i") },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      AdminEquipmentChecklist.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AdminEquipmentChecklist.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── GET /api/equipment-checklist/:id ───────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(422).json({ success: false, message: "Invalid ID" });
    }
    const log = await AdminEquipmentChecklist.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: "Checklist not found" });
    }
    res.json({ success: true, data: log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── POST /api/equipment-checklist ──────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { checkedBy, date, items } = req.body;
    if (!checkedBy || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid request payload" });
    }

    const newLog = new AdminEquipmentChecklist({
      checkedBy,
      date: date || new Date(),
      items,
    });

    await newLog.save();
    res.status(201).json({ success: true, data: newLog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── DELETE /api/equipment-checklist/:id ────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(422).json({ success: false, message: "Invalid ID" });
    }
    const log = await AdminEquipmentChecklist.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: "Checklist not found" });
    }
    res.json({ success: true, message: "Checklist deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;

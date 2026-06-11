
import express from "express";
import mongoose from "mongoose";
import Asset from "../../model/it-helpdesk/assetModel.mjs";

const router = express.Router();

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID" });
  }
  next();
};

router.get("/", async (req, res) => {
  try {
    const { type, status, location, assigned_to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.asset_type = type;
    if (status) filter.status = status;
    if (location) filter.location = new RegExp(location, "i");
    if (assigned_to) filter.assigned_to = assigned_to;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Asset.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Asset.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const [total, assigned, available, inRepair] = await Promise.all([
      Asset.countDocuments(),
      Asset.countDocuments({ status: "Assigned" }),
      Asset.countDocuments({ status: "Available" }),
      Asset.countDocuments({ status: "In Repair" }),
    ]);
    res.json({ success: true, data: { total, assigned, available, inRepair } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

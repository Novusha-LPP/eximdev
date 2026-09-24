import express from "express";
import mongoose from "mongoose";
import License from "../../model/it-helpdesk/licenseModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();

router.use(authMiddleware);

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID" });
  }
  next();
};

// ── GET license stats ────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, active, expiring, expired] = await Promise.all([
      License.countDocuments({}),
      License.countDocuments({
        $or: [
          { expiry_date: null },
          { expiry_date: { $gt: thirtyDaysFromNow } }
        ]
      }),
      License.countDocuments({
        expiry_date: { $gte: today, $lte: thirtyDaysFromNow }
      }),
      License.countDocuments({
        expiry_date: { $lt: today }
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        expiring,
        expired,
      },
    });
  } catch (err) {
    logger.error(`Error fetching license stats: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET all licenses with pagination & filtering ─────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, license_type, type, search, page = 1, limit = 15, all, fromDate, toDate } = req.query;
    const filter = {};

    const selectedType = license_type || type;
    if (selectedType && selectedType !== "ALL") {
      filter.license_type = selectedType;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    if (status) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (status === "Active") {
        filter.$or = [{ expiry_date: null }, { expiry_date: { $gt: thirtyDaysFromNow } }];
      } else if (status === "Expiring Soon") {
        filter.expiry_date = { $gte: today, $lte: thirtyDaysFromNow };
      } else if (status === "Expired") {
        filter.expiry_date = { $lt: today };
      } else if (status === "No Expiry") {
        filter.expiry_date = null;
      } else {
        filter.status = status;
      }
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      const searchConditions = [
        { license_name: searchRegex },
        { license_code: searchRegex },
        { software_name: searchRegex },
        { assigned_to: searchRegex },
        { assigned_asset: searchRegex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    if (all === "true") {
      const data = await License.find(filter)
        .populate("vendor", "name")
        .sort({ expiry_date: 1 });
      return res.json({ success: true, data });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 15);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      License.find(filter)
        .populate("vendor", "name")
        .sort({ expiry_date: 1 })
        .skip(skip)
        .limit(limitNum),
      License.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    logger.error(`Error fetching licenses: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const license = new License(req.body);
    await license.save();
    res.status(201).json({ success: true, data: license });
  } catch (err) {
    logger.error(`Error creating license: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const license = await License.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: license });
  } catch (err) {
    logger.error(`Error updating license: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await License.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "License deleted" });
  } catch (err) {
    logger.error(`Error deleting license: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

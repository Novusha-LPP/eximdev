import express from "express";
import mongoose from "mongoose";
import Inventory from "../../model/it-helpdesk/inventoryModel.mjs";
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

// ── GET inventory stats ──────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    const [total, old, newStock, activeWarranty] = await Promise.all([
      Inventory.countDocuments({}),
      Inventory.countDocuments({ inventory_type: "Old" }),
      Inventory.countDocuments({ inventory_type: "New" }),
      Inventory.countDocuments({ warranty_end_date: { $gt: today } }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        old,
        new: newStock,
        activeWarranty,
      },
    });
  } catch (err) {
    logger.error(`Error fetching inventory stats: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET all inventory items with pagination & filtering ──────────────────────
router.get("/", async (req, res) => {
  try {
    const { category, inventory_type, status, search, page = 1, limit = 15, all, fromDate, toDate } = req.query;
    const filter = {};

    if (category && category !== "ALL") {
      filter.category = category;
    }

    const selectedType = inventory_type || status;
    if (selectedType && selectedType !== "ALL") {
      filter.inventory_type = { $regex: new RegExp(`^${selectedType.trim()}$`, "i") };
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

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { item_id: searchRegex },
        { brand: searchRegex },
        { model: searchRegex },
        { category: searchRegex },
      ];
    }

    if (all === "true") {
      const data = await Inventory.find(filter).sort({ createdAt: -1 });
      return res.json({ success: true, data });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 15);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Inventory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Inventory.countDocuments(filter),
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
    logger.error(`Error fetching inventory: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const itemData = { ...req.body };
    if (itemData.inventory_type) {
      itemData.inventory_type = itemData.inventory_type.toLowerCase() === "new" ? "New" : "Old";
    }
    if (!itemData.warranty_start_date || isNaN(new Date(itemData.warranty_start_date).getTime())) {
      delete itemData.warranty_start_date;
    }
    if (!itemData.warranty_end_date || isNaN(new Date(itemData.warranty_end_date).getTime())) {
      delete itemData.warranty_end_date;
    }

    const item = new Inventory(itemData);
    await item.save();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    logger.error(`Error creating inventory item: ${err.message}`);
    let errorMessage = err.message;
    if (err.code === 11000) {
      errorMessage = `An item with Item ID "${req.body.item_id}" already exists.`;
    }
    res.status(500).json({ success: false, message: errorMessage });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.inventory_type) {
      updateData.inventory_type = updateData.inventory_type.toLowerCase() === "new" ? "New" : "Old";
    }
    if (!updateData.warranty_start_date || isNaN(new Date(updateData.warranty_start_date).getTime())) {
      updateData.warranty_start_date = null;
    }
    if (!updateData.warranty_end_date || isNaN(new Date(updateData.warranty_end_date).getTime())) {
      updateData.warranty_end_date = null;
    }

    const item = await Inventory.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Error updating inventory item: ${err.message}`);
    let errorMessage = err.message;
    if (err.code === 11000) {
      errorMessage = `An item with Item ID "${req.body.item_id}" already exists.`;
    }
    res.status(500).json({ success: false, message: errorMessage });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Inventory item deleted" });
  } catch (err) {
    logger.error(`Error deleting inventory item: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

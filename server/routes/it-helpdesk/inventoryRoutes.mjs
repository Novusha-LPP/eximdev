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

router.get("/", async (req, res) => {
  try {
    const { category, inventory_type } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (inventory_type) {
      filter.inventory_type = { $regex: new RegExp(`^${inventory_type.trim()}$`, "i") };
    }

    const data = await Inventory.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data });
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

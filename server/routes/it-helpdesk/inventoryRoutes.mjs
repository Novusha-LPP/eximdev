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
    if (inventory_type) filter.inventory_type = inventory_type;

    const data = await Inventory.find(filter).sort({ item_name: 1 });
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`Error fetching inventory: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const item = new Inventory(req.body);
    await item.save();
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    logger.error(`Error creating inventory item: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error(`Error updating inventory item: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
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

import express from "express";
import mongoose from "mongoose";
import Vendor from "../../model/it-helpdesk/vendorModel.mjs";
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
    const data = await Vendor.find({ is_active: true }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`Error fetching vendors: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    // Ensure is_active is set to true for new vendors
    const vendorData = { ...req.body, is_active: true };
    
    // Ensure vendor_type is properly captured from either field
    if (!vendorData.vendor_type && vendorData.type) {
      vendorData.vendor_type = vendorData.type;
    }
    if (vendorData.vendor_type) {
      vendorData.vendor_type = vendorData.vendor_type.trim();
    }
    
    const vendor = new Vendor(vendorData);
    const savedVendor = await vendor.save();
    
    res.status(201).json({ success: true, data: savedVendor });
  } catch (err) {
    console.error("Error creating vendor:", err);
    logger.error(`Error creating vendor: ${err.message}`, { stack: err.stack });
    
    let errorMessage = "Error creating vendor";
    if (err.name === "ValidationError") {
      errorMessage = `Validation error: ${Object.values(err.errors).map(e => e.message).join(", ")}`;
    } else if (err.code === 11000) {
      errorMessage = "Vendor with this name already exists";
    } else if (err.name === "MongoError") {
      errorMessage = `Database error: ${err.message}`;
    }
    
    res.status(500).json({ success: false, message: errorMessage });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const currentVendor = await Vendor.findById(req.params.id);
    if (!currentVendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    
    const updateData = { ...req.body };
    if (!updateData.hasOwnProperty("is_active")) {
      updateData.is_active = currentVendor.is_active;
    }
    
    // Ensure vendor_type is properly captured from either field
    if (!updateData.vendor_type && updateData.type) {
      updateData.vendor_type = updateData.type;
    }
    if (updateData.vendor_type) {
      updateData.vendor_type = updateData.vendor_type.trim();
    }
    
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, data: vendor });
  } catch (err) {
    console.error("Error updating vendor:", err);
    console.error("Error stack:", err.stack);
    logger.error(`Error updating vendor: ${err.message}`, { stack: err.stack });
    
    // Provide more detailed error information
    let errorMessage = "Error updating vendor";
    if (err.name === "ValidationError") {
      errorMessage = `Validation error: ${Object.values(err.errors).map(e => e.message).join(", ")}`;
    } else if (err.code === 11000) {
      errorMessage = "Vendor with this name already exists";
    } else if (err.name === "MongoError") {
      errorMessage = `Database error: ${err.message}`;
    }
    
    console.error("Final error message:", errorMessage);
    res.status(500).json({ success: false, message: errorMessage });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Vendor deleted" });
  } catch (err) {
    logger.error(`Error deleting vendor: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from "express";
import ShippingLineModel from "../../model/shippingLineModel.mjs";

const router = express.Router();

// Get all shipping lines
router.get("/get-shipping-lines", async (req, res) => {
  try {
    const shippingLines = await ShippingLineModel.find().sort({ name: 1 });
    res.status(200).json(shippingLines);
  } catch (error) {
    console.error("Error fetching shipping lines:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a shipping line
router.post("/add-shipping-line", async (req, res) => {
  try {
    const shippingLine = new ShippingLineModel(req.body);
    await shippingLine.save();
    res.status(201).json({ message: "Shipping Line added successfully", shippingLine });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Shipping Line name already exists" });
    }
    console.error("Error adding shipping line:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a shipping line
router.put("/update-shipping-line/:id", async (req, res) => {
  try {
    const updatedShippingLine = await ShippingLineModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedShippingLine) {
      return res.status(404).json({ message: "Shipping Line not found" });
    }
    res.status(200).json({ message: "Shipping Line updated successfully", shippingLine: updatedShippingLine });
  } catch (error) {
    console.error("Error updating shipping line:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a shipping line
router.delete("/delete-shipping-line/:id", async (req, res) => {
  try {
    const deleted = await ShippingLineModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Shipping Line not found" });
    }
    res.status(200).json({ message: "Shipping Line deleted successfully" });
  } catch (error) {
    console.error("Error deleting shipping line:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

import express from "express";
import ShippingLine from "../../../model/srcc/Directory_Management/ShippingLine.mjs";
// ^ Adjust path as needed

const router = express.Router();

// CREATE: Add new Shipping Line
router.post("/api/add-shipping-line", async (req, res) => {
  try {
    const { name } = req.body;
    // Optional: Check if name already exists if you have uniqueness requirement
    // const existingLine = await ShippingLine.findOne({ name });
    // if (existingLine) return res.status(400).json({ error: "Shipping line already exists" });

    const newLine = await ShippingLine.create({ name });
    res.status(201).json({
      message: "Shipping line added successfully",
      data: newLine,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ error: "Shipping line already exists" });
    }
    console.error("Error adding ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL: Get all Shipping Lines
router.get("/api/get-shipping-line", async (req, res) => {
  try {
    const lines = await ShippingLine.find();
    res.status(200).json({ data: lines });
  } catch (error) {
    console.error("❌ Error fetching ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE: Get by ID
router.get("/api/get-shipping-line/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const line = await ShippingLine.findById(id);
    if (!line) {
      return res.status(404).json({ error: "Shipping line not found" });
    }
    res.status(200).json({ data: line });
  } catch (error) {
    console.error("❌ Error fetching ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE
router.put("/api/update-shipping-line/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Optional uniqueness check
    // const existingLine = await ShippingLine.findOne({ name, _id: { $ne: id } });
    // if (existingLine) return res.status(400).json({ error: "Shipping line already exists" });

    const updatedLine = await ShippingLine.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!updatedLine) {
      return res.status(404).json({ error: "Shipping line not found" });
    }

    res.status(200).json({
      message: "Shipping line updated successfully",
      data: updatedLine,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ error: "Shipping line already exists" });
    }
    console.error("❌ Error updating ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE
router.delete("/api/delete-shipping-line/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedLine = await ShippingLine.findByIdAndDelete(id);
    if (!deletedLine) {
      return res.status(404).json({ error: "Shipping line not found" });
    }

    res.status(200).json({
      message: "Shipping line deleted successfully",
      data: deletedLine,
    });
  } catch (error) {
    console.error("❌ Error deleting ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import express from "express";
import ShippingLine from "../../../model/srcc/Directory_Management/ShippingLine.mjs";
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// CREATE: Add new Shipping Line
router.post("/api/add-shipping-line", async (req, res) => {
  try {
    const { name, organisation, code } = req.body;

    if (!organisation || !organisation._id || !organisation.name) {
      return res.status(400).json({ error: "Organisation info is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const newLine = await ShippingLine.create({ name, organisation, code });
    res.status(201).json({
      message: "Shipping line added successfully",
      data: newLine,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Shipping line already exists" });
    }
    console.error("Error adding ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL
router.get("/api/get-shipping-line",authenticateJWT, async (req, res) => {
  try {
    const lines = await ShippingLine.find();
    res.status(200).json({ data: lines });
  } catch (error) {
    console.error("❌ Error fetching ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE
router.get("/api/get-shipping-line/:id",authenticateJWT, async (req, res) => {
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
  const { name, organisation, code } = req.body;

  try {
    if (!organisation || !organisation._id || !organisation.name) {
      return res.status(400).json({ error: "Organisation info is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const updatedLine = await ShippingLine.findByIdAndUpdate(
      id,
      { name, organisation, code },
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

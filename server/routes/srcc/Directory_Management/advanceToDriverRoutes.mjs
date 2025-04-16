import express from "express";
import AdvanceToDriver from "../../../model/srcc/Directory_Management/AdvanceToDriver.mjs"; 
import { authenticateJWT } from "../../../auth/auth.mjs";
// ^ Adjust path as needed

const router = express.Router();

// CREATE: Add new "Advance to Driver"
router.post("/api/add-advance-to-driver",authenticateJWT, async (req, res) => {
  try {
    const advanceItem = await AdvanceToDriver.create(req.body);
    res.status(201).json({
      message: "Advance to Driver added successfully",
      data: advanceItem,
    });
  } catch (error) {
    console.error("❌ Error adding AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL
router.get("/api/get-advance-to-driver",authenticateJWT, async (req, res) => {
  try {
    const dataList = await AdvanceToDriver.find();
    res.status(200).json({ data: dataList });
  } catch (error) {
    console.error("❌ Error fetching AdvanceToDriver list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE
router.get("/api/get-advance-to-driver/:id",authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const dataItem = await AdvanceToDriver.findById(id);
    if (!dataItem) {
      return res.status(404).json({ error: "AdvanceToDriver not found" });
    }
    res.status(200).json({ data: dataItem });
  } catch (error) {
    console.error("❌ Error fetching AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE
router.put("/api/update-advance-to-driver/:id",authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const updatedItem = await AdvanceToDriver.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ error: "AdvanceToDriver not found" });
    }

    res.status(200).json({
      message: "Advance to Driver updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("❌ Error updating AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE
router.delete("/api/delete-advance-to-driver/:id",authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await AdvanceToDriver.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ error: "AdvanceToDriver not found" });
    }
    res.status(200).json({
      message: "Advance to Driver deleted successfully",
      data: deletedItem,
    });
  } catch (error) {
    console.error("❌ Error deleting AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

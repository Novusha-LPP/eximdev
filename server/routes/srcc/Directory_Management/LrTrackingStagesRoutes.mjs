import express from "express";
import LrTrackingStages from "../../../model/srcc/Directory_Management/LrTrackingStages.mjs";

const router = express.Router();

// Create new tracking stage
router.post("/api/lr-tracking-stages/create", async (req, res) => {
  try {
    const newStage = new LrTrackingStages(req.body);
    const savedStage = await newStage.save();
    res.status(201).json(savedStage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all tracking stages
router.get("/api/lr-tracking-stages/all", async (req, res) => {
  try {
    const stages = await LrTrackingStages.find();
    res.status(200).json(stages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single tracking stage by ID
router.get("/api/lr-tracking-stages/:id", async (req, res) => {
  try {
    const stage = await LrTrackingStages.findById(req.params.id);
    if (!stage) {
      return res.status(404).json({ message: "Stage not found" });
    }
    res.status(200).json(stage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update tracking stage by ID
router.put("/api/lr-tracking-stages/:id", async (req, res) => {
  try {
    const updatedStage = await LrTrackingStages.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedStage) {
      return res.status(404).json({ message: "Stage not found" });
    }
    res.status(200).json(updatedStage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete tracking stage by ID
router.delete("/api/lr-tracking-stages/:id", async (req, res) => {
  try {
    const deletedStage = await LrTrackingStages.findByIdAndDelete(
      req.params.id
    );
    if (!deletedStage) {
      return res.status(404).json({ message: "Stage not found" });
    }
    res.status(200).json({ message: "Stage deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

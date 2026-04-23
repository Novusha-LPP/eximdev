import express from "express";
import EmptyOffLocationModel from "../../model/emptyOffLocationModel.mjs";

const router = express.Router();

// Get all empty off locations
router.get("/get-empty-off-locations", async (req, res) => {
  try {
    const locations = await EmptyOffLocationModel.find().sort({ name: 1 });
    res.status(200).json(locations);
  } catch (error) {
    console.error("Error fetching empty off locations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add an empty off location
router.post("/add-empty-off-location", async (req, res) => {
  try {
    const location = new EmptyOffLocationModel(req.body);
    await location.save();
    res.status(201).json({ message: "Empty Off Location added successfully", location });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Location name already exists" });
    }
    console.error("Error adding empty off location:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update an empty off location
router.put("/update-empty-off-location/:id", async (req, res) => {
  try {
    const location = await EmptyOffLocationModel.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: "Empty Off Location not found" });
    }
    
    // Explicitly update fields from req.body
    location.set(req.body);
    
    await location.save();
    res.status(200).json({ message: "Empty Off Location updated successfully", location });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Location name already exists" });
    }
    console.error("Error updating empty off location:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete an empty off location
router.delete("/delete-empty-off-location/:id", async (req, res) => {
  try {
    const deleted = await EmptyOffLocationModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Empty Off Location not found" });
    }
    res.status(200).json({ message: "Empty Off Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting empty off location:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific branch from an empty off location
router.delete("/delete-empty-off-location/:id/branch/:branchId", async (req, res) => {
  try {
    const location = await EmptyOffLocationModel.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: "Empty Off Location not found" });
    }
    
    location.branches = location.branches.filter(
      (b) => b._id.toString() !== req.params.branchId
    );
    
    await location.save();
    res.status(200).json({ message: "Branch deleted successfully", location });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific bank account from a branch in an empty off location
router.delete("/delete-empty-off-location/:id/branch/:branchId/account/:accountId", async (req, res) => {
  try {
    const location = await EmptyOffLocationModel.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: "Empty Off Location not found" });
    }
    
    const branch = location.branches.id(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    
    branch.accounts = branch.accounts.filter(
      (acc) => acc._id.toString() !== req.params.accountId
    );
    
    await location.save();
    res.status(200).json({ message: "Bank account deleted successfully", location });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

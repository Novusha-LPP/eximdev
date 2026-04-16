import express from "express";
import TransporterModel from "../../model/transporterModel.mjs";

const router = express.Router();

// Get all transporters
router.get("/get-transporters", async (req, res) => {
  try {
    const transporters = await TransporterModel.find().sort({ name: 1 });
    res.status(200).json(transporters);
  } catch (error) {
    console.error("Error fetching transporters:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a transporter
router.post("/add-transporter", async (req, res) => {
  try {
    const transporter = new TransporterModel(req.body);
    await transporter.save();
    res.status(201).json({ message: "Transporter added successfully", transporter });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Transporter name already exists" });
    }
    console.error("Error adding transporter:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a transporter
router.put("/update-transporter/:id", async (req, res) => {
  try {
    const transporter = await TransporterModel.findById(req.params.id);
    if (!transporter) {
      return res.status(404).json({ message: "Transporter not found" });
    }
    
    transporter.set(req.body);
    
    await transporter.save();
    res.status(200).json({ message: "Transporter updated successfully", transporter });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Transporter name already exists" });
    }
    console.error("Error updating transporter:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a transporter
router.delete("/delete-transporter/:id", async (req, res) => {
  try {
    const deleted = await TransporterModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Transporter not found" });
    }
    res.status(200).json({ message: "Transporter deleted successfully" });
  } catch (error) {
    console.error("Error deleting transporter:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific branch from a transporter
router.delete("/delete-transporter/:id/branch/:branchId", async (req, res) => {
  try {
    const transporter = await TransporterModel.findById(req.params.id);
    if (!transporter) {
      return res.status(404).json({ message: "Transporter not found" });
    }
    
    transporter.branches = transporter.branches.filter(
      (b) => b._id.toString() !== req.params.branchId
    );
    
    await transporter.save();
    res.status(200).json({ message: "Branch deleted successfully", transporter });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific bank account from a branch in a transporter
router.delete("/delete-transporter/:id/branch/:branchId/account/:accountId", async (req, res) => {
  try {
    const transporter = await TransporterModel.findById(req.params.id);
    if (!transporter) {
      return res.status(404).json({ message: "Transporter not found" });
    }
    
    const branch = transporter.branches.id(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    
    branch.accounts = branch.accounts.filter(
      (acc) => acc._id.toString() !== req.params.accountId
    );
    
    await transporter.save();
    res.status(200).json({ message: "Bank account deleted successfully", transporter });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

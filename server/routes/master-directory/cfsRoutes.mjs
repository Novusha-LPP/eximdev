import express from "express";
import CfsModel from "../../model/cfsModel.mjs";

const router = express.Router();

// Get all CFS entries
router.get("/get-cfs-list", async (req, res) => {
  try {
    const cfsList = await CfsModel.find().sort({ name: 1 });
    res.status(200).json(cfsList);
  } catch (error) {
    console.error("Error fetching CFS list:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a CFS
router.post("/add-cfs", async (req, res) => {
  try {
    const cfs = new CfsModel(req.body);
    await cfs.save();
    res.status(201).json({ message: "CFS added successfully", cfs });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "CFS name already exists" });
    }
    console.error("Error adding CFS:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a CFS
router.put("/update-cfs/:id", async (req, res) => {
  try {
    const cfs = await CfsModel.findById(req.params.id);
    if (!cfs) {
      return res.status(404).json({ message: "CFS not found" });
    }
    
    // Explicitly update fields from req.body
    cfs.set(req.body);
    
    await cfs.save();
    res.status(200).json({ message: "CFS updated successfully", cfs });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "CFS name already exists" });
    }
    console.error("Error updating CFS:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a CFS
router.delete("/delete-cfs/:id", async (req, res) => {
  try {
    const deleted = await CfsModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "CFS not found" });
    }
    res.status(200).json({ message: "CFS deleted successfully" });
  } catch (error) {
    console.error("Error deleting CFS:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific branch from a CFS
router.delete("/delete-cfs/:id/branch/:branchId", async (req, res) => {
  try {
    const cfs = await CfsModel.findById(req.params.id);
    if (!cfs) {
      return res.status(404).json({ message: "CFS not found" });
    }
    
    cfs.branches = cfs.branches.filter(
      (b) => b._id.toString() !== req.params.branchId
    );
    
    await cfs.save();
    res.status(200).json({ message: "Branch deleted successfully", cfs });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific bank account from a branch in a CFS
router.delete("/delete-cfs/:id/branch/:branchId/account/:accountId", async (req, res) => {
  try {
    const cfs = await CfsModel.findById(req.params.id);
    if (!cfs) {
      return res.status(404).json({ message: "CFS not found" });
    }
    
    const branch = cfs.branches.id(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    
    branch.accounts = branch.accounts.filter(
      (acc) => acc._id.toString() !== req.params.accountId
    );
    
    await cfs.save();
    res.status(200).json({ message: "Bank account deleted successfully", cfs });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

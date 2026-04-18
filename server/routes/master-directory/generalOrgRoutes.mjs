import express from "express";
import GeneralOrgModel from "../../model/generalOrgModel.mjs";

const router = express.Router();

// Get all general orgs
router.get("/get-general-orgs", async (req, res) => {
  try {
    const generalOrgs = await GeneralOrgModel.find().sort({ name: 1 });
    res.status(200).json(generalOrgs);
  } catch (error) {
    console.error("Error fetching general orgs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a general org
router.post("/add-general-org", async (req, res) => {
  try {
    const generalOrg = new GeneralOrgModel(req.body);
    await generalOrg.save();
    res.status(201).json({ message: "General Org added successfully", generalOrg });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "General Org name already exists" });
    }
    console.error("Error adding general org:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a general org
router.put("/update-general-org/:id", async (req, res) => {
  try {
    const generalOrg = await GeneralOrgModel.findById(req.params.id);
    if (!generalOrg) {
      return res.status(404).json({ message: "General Org not found" });
    }
    
    // Explicitly update fields from req.body
    generalOrg.set(req.body);
    
    await generalOrg.save();
    res.status(200).json({ message: "General Org updated successfully", generalOrg });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "General Org name already exists" });
    }
    console.error("Error updating general org:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a general org
router.delete("/delete-general-org/:id", async (req, res) => {
  try {
    const deleted = await GeneralOrgModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "General Org not found" });
    }
    res.status(200).json({ message: "General Org deleted successfully" });
  } catch (error) {
    console.error("Error deleting general org:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific branch from a general org
router.delete("/delete-general-org/:id/branch/:branchId", async (req, res) => {
  try {
    const generalOrg = await GeneralOrgModel.findById(req.params.id);
    if (!generalOrg) {
      return res.status(404).json({ message: "General Org not found" });
    }
    
    generalOrg.branches = generalOrg.branches.filter(
      (b) => b._id.toString() !== req.params.branchId
    );
    
    await generalOrg.save();
    res.status(200).json({ message: "Branch deleted successfully", generalOrg });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific bank account from a branch in a general org
router.delete("/delete-general-org/:id/branch/:branchId/account/:accountId", async (req, res) => {
  try {
    const generalOrg = await GeneralOrgModel.findById(req.params.id);
    if (!generalOrg) {
      return res.status(404).json({ message: "General Org not found" });
    }
    
    const branch = generalOrg.branches.id(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    
    branch.accounts = branch.accounts.filter(
      (acc) => acc._id.toString() !== req.params.accountId
    );
    
    await generalOrg.save();
    res.status(200).json({ message: "Bank account deleted successfully", generalOrg });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

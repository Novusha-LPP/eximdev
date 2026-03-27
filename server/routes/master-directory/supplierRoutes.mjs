import express from "express";
import SupplierModel from "../../model/supplierModel.mjs";

const router = express.Router();

// Get all suppliers
router.get("/get-suppliers", async (req, res) => {
  try {
    const suppliers = await SupplierModel.find().sort({ name: 1 });
    res.status(200).json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a supplier
router.post("/add-supplier", async (req, res) => {
  try {
    const supplier = new SupplierModel(req.body);
    await supplier.save();
    res.status(201).json({ message: "Supplier added successfully", supplier });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Supplier name already exists" });
    }
    console.error("Error adding supplier:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a supplier
router.put("/update-supplier/:id", async (req, res) => {
  try {
    const supplier = await SupplierModel.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    // Explicitly update fields from req.body
    supplier.set(req.body);
    
    await supplier.save();
    res.status(200).json({ message: "Supplier updated successfully", supplier });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Supplier name already exists" });
    }
    console.error("Error updating supplier:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a supplier
router.delete("/delete-supplier/:id", async (req, res) => {
  try {
    const deleted = await SupplierModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific branch from a supplier
router.delete("/delete-supplier/:id/branch/:branchId", async (req, res) => {
  try {
    const supplier = await SupplierModel.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    supplier.branches = supplier.branches.filter(
      (b) => b._id.toString() !== req.params.branchId
    );
    
    await supplier.save();
    res.status(200).json({ message: "Branch deleted successfully", supplier });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific bank account from a branch in a supplier
router.delete("/delete-supplier/:id/branch/:branchId/account/:accountId", async (req, res) => {
  try {
    const supplier = await SupplierModel.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    const branch = supplier.branches.id(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    
    branch.accounts = branch.accounts.filter(
      (acc) => acc._id.toString() !== req.params.accountId
    );
    
    await supplier.save();
    res.status(200).json({ message: "Bank account deleted successfully", supplier });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

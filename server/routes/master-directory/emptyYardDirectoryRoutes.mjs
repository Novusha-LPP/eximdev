import express from "express";
import EmptyYardDirectoryModel from "../../model/emptyYardDirectoryModel.mjs";

const router = express.Router();

// GET /get-empty-yard-directory-list (and /api/get-empty-yard-directory-list)
router.get(["/get-empty-yard-directory-list", "/api/get-empty-yard-directory-list"], async (req, res) => {
  try {
    const list = await EmptyYardDirectoryModel.find().sort({ name: 1 }).lean();
    res.json(list);
  } catch (error) {
    console.error("Error fetching Empty Yard directory list:", error);
    res.status(500).json({ message: "Unable to load Empty Yard directory" });
  }
});

// GET /empty-yard-codes with pagination and search
router.get(["/empty-yard-codes", "/api/empty-yard-codes"], async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", active = "" } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "branches.city": { $regex: search, $options: "i" } },
        { "branches.gst": { $regex: search, $options: "i" } },
        { "branches.pan": { $regex: search, $options: "i" } },
      ];
    }
    if (active) query.active = active;

    const total = await EmptyYardDirectoryModel.countDocuments(query);
    const data = await EmptyYardDirectoryModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        perPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching Empty Yard codes:", error);
    res.status(500).json({ message: "Unable to load Empty Yard directory" });
  }
});

// POST /add-empty-yard-directory
router.post(["/add-empty-yard-directory", "/api/add-empty-yard-directory"], async (req, res) => {
  try {
    const data = await EmptyYardDirectoryModel.create(req.body);
    res.status(201).json({ message: "Empty Yard added successfully", data });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Empty Yard name already exists" });
    }
    console.error("Error creating Empty Yard:", error);
    res.status(500).json({ message: "Unable to create Empty Yard" });
  }
});

// PUT /update-empty-yard-directory/:id
router.put(["/update-empty-yard-directory/:id", "/api/update-empty-yard-directory/:id"], async (req, res) => {
  try {
    const data = await EmptyYardDirectoryModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!data) return res.status(404).json({ message: "Empty Yard not found" });
    res.json({ message: "Empty Yard updated successfully", data });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Empty Yard name already exists" });
    }
    console.error("Error updating Empty Yard:", error);
    res.status(500).json({ message: "Unable to update Empty Yard" });
  }
});

// DELETE /delete-empty-yard-directory/:id
router.delete(["/delete-empty-yard-directory/:id", "/api/delete-empty-yard-directory/:id"], async (req, res) => {
  try {
    const data = await EmptyYardDirectoryModel.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ message: "Empty Yard not found" });
    res.json({ success: true, message: "Empty Yard deleted successfully" });
  } catch (error) {
    console.error("Error deleting Empty Yard:", error);
    res.status(500).json({ message: "Unable to delete Empty Yard" });
  }
});

// DELETE /delete-empty-yard-directory/:id/branch/:branchId
router.delete(["/delete-empty-yard-directory/:id/branch/:branchId", "/api/delete-empty-yard-directory/:id/branch/:branchId"], async (req, res) => {
  try {
    const data = await EmptyYardDirectoryModel.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Empty Yard not found" });
    data.branches = data.branches.filter((b) => String(b._id) !== req.params.branchId);
    await data.save();
    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (error) {
    console.error("Error deleting Empty Yard branch:", error);
    res.status(500).json({ message: "Unable to delete branch" });
  }
});

// DELETE /delete-empty-yard-directory/:id/branch/:branchId/account/:accountId
router.delete(["/delete-empty-yard-directory/:id/branch/:branchId/account/:accountId", "/api/delete-empty-yard-directory/:id/branch/:branchId/account/:accountId"], async (req, res) => {
  try {
    const data = await EmptyYardDirectoryModel.findById(req.params.id);
    const branch = data?.branches.id(req.params.branchId);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    branch.accounts = branch.accounts.filter((a) => String(a._id) !== req.params.accountId);
    await data.save();
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting Empty Yard account:", error);
    res.status(500).json({ message: "Unable to delete account" });
  }
});

export default router;

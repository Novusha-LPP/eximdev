import express from "express";
import CfsDirectoryModel from "../../model/cfsDirectoryModel.mjs";

const router = express.Router();

router.get("/get-cfs-directory-list", async (req, res) => {
  try { res.json(await CfsDirectoryModel.find().sort({ name: 1 }).lean()); }
  catch (error) { res.status(500).json({ message: "Unable to load CFS directory" }); }
});

router.post("/add-cfs-directory", async (req, res) => {
  try { res.status(201).json({ data: await CfsDirectoryModel.create(req.body) }); }
  catch (error) { res.status(error.code === 11000 ? 400 : 500).json({ message: error.code === 11000 ? "CFS name already exists" : "Unable to create CFS" }); }
});

router.put("/update-cfs-directory/:id", async (req, res) => {
  try {
    const data = await CfsDirectoryModel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ message: "CFS not found" });
    res.json({ data });
  } catch (error) { res.status(error.code === 11000 ? 400 : 500).json({ message: "Unable to update CFS" }); }
});

router.delete("/delete-cfs-directory/:id", async (req, res) => {
  try {
    const data = await CfsDirectoryModel.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ message: "CFS not found" });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Unable to delete CFS" }); }
});

router.delete("/delete-cfs-directory/:id/branch/:branchId", async (req, res) => {
  try {
    const data = await CfsDirectoryModel.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "CFS not found" });
    data.branches = data.branches.filter((branch) => String(branch._id) !== req.params.branchId);
    await data.save();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Unable to delete CFS branch" }); }
});

router.delete("/delete-cfs-directory/:id/branch/:branchId/account/:accountId", async (req, res) => {
  try {
    const data = await CfsDirectoryModel.findById(req.params.id);
    const branch = data?.branches.id(req.params.branchId);
    if (!branch) return res.status(404).json({ message: "CFS branch not found" });
    branch.accounts = branch.accounts.filter((account) => String(account._id) !== req.params.accountId);
    await data.save();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Unable to delete CFS account" }); }
});

export default router;


import express from "express";
import mongoose from "mongoose";
import License from "../../model/it-helpdesk/licenseModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID" });
  }
  next();
};

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const data = await License.find(filter)
      .populate("vendor", "name")
      .sort({ expiry_date: 1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", auditMiddleware("ITLicense"), async (req, res) => {
  try {
    const license = new License(req.body);
    await license.save();
    res.status(201).json({ success: true, data: license });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const license = await License.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: license });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await License.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "License deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

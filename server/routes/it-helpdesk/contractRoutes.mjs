
import express from "express";
import mongoose from "mongoose";
import Contract from "../../model/it-helpdesk/contractModel.mjs";
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
    const { contract_type, status } = req.query;
    const filter = {};
    if (contract_type) filter.contract_type = contract_type;
    if (status) filter.status = status;

    const data = await Contract.find(filter)
      .populate("vendor", "name")
      .sort({ end_date: 1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", auditMiddleware("ITContract"), async (req, res) => {
  try {
    const contract = new Contract(req.body);
    await contract.save();
    res.status(201).json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, error: err.name });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Contract.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Contract deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

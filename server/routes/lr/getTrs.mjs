import express from "express";
import PrData from "../../model/srcc/pr.mjs";
const router = express.Router();

router.post("/api/get-trs", async (req, res) => {
  const { pr_no } = req.body;
  const data = await PrData.findOne({ pr_no });
  if (!data) {
    return res.status(404).json({ message: "Not found" });
  }
  const trs = data.containers;

  res.status(200).json(trs);
});

export default router;

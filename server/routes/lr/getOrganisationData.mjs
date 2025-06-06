import express from "express";
import CustomerKycModel from "../../model/customerKycModel.mjs";

const router = express.Router();

router.post("/api/get-organisation-data", async (req, res) => {
  const { name_of_individual } = req.body;
  const data = await CustomerKycModel.findOne({ name_of_individual });
  if (!data) {
    return res.status(200).json({ message: "Data not found" });
  }
  res.status(200).json(data);
});

export default router;
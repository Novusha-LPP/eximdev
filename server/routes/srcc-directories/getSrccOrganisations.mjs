import express from "express";
import CustomerKycModel from "../../model/customerKycModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-srcc-organisations",authenticateJWT, async (req, res) => {
  const data = await CustomerKycModel.find({ module: "Transportation" });
  if (!data) {
    return res.status(200).json({ message: "Data not found" });
  }
  res.status(200).json(data);
});

export default router;

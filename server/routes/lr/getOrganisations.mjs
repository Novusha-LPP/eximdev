import express from "express";
import CustomerKycModel from "../../model/customerKycModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-organisations",authenticateJWT, async (req, res) => {
  const data = await CustomerKycModel.find();
  res.status(200).json(data.map((item) => item.name_of_individual));
});

export default router;

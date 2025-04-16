import express from "express";
import CustomerKycModel from "../../model/customerKycModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/view-customer-kyc-details/:_id",authenticateJWT, async (req, res) => {
  const { _id } = req.params;

  try {
    if (!_id) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const data = await CustomerKycModel.findOne({ _id });

    if (!data) {
      return res.status(404).json({ error: "Customer KYC details not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching customer KYC details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

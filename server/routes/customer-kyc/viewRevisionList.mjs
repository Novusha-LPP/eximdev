import express from "express";
import CustomerKycModel from "../../model/customerKycModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/view-revision-list",authenticateJWT, async (req, res) => {
  try {
    const data = await CustomerKycModel.find({
      remarks: { $exists: true, $ne: "" },
    }).select(
      "_id name_of_individual category status iec_no approval approved_by remarks"
    );

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

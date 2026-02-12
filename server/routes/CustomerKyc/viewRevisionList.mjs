import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

router.get("/api/view-revision-list", async (req, res) => {
  try {
    const data = await CustomerKycModel.find({
      approval: "Sent for revision",
    }).select(
      "_id name_of_individual category status iec_no approval approved_by remarks"
    );

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching customer KYC details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

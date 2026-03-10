import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

router.get("/api/financial-approval-pending", async (req, res) => {
  try {
    const data = await CustomerKycModel.find({
      approval: "Pending",
      financial_details_approved: { $ne: true },
    }).select(
      "_id name_of_individual category status iec_no approval financial_details_approved financial_details_approved_by remarks"
    );
    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching financial approval pending list:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

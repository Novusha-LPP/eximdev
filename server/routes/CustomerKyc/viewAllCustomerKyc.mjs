import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

router.get("/api/view-all-customer-kyc", async (req, res) => {
  try {
    // Get all KYC records with relevant fields
    const data = await CustomerKycModel.find({
      draft: { $ne: "true" } // Exclude drafts
    }).select(
      "_id name_of_individual category status iec_no pan_no permanent_address_telephone permanent_address_email approval approved_by remarks createdAt updatedAt"
    ).sort({ updatedAt: -1 }); // Sort by most recently updated
    
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching all customer KYC data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

router.patch("/api/customer-kyc-financial-approval/:_id", async (req, res) => {
  const { _id } = req.params;
  const { financial_details_approved, financial_details_approved_by } = req.body;

  if (!_id) {
    return res.status(400).json({ message: "Customer KYC ID is required" });
  }

  try {
    const updateFields = {
      financial_details_approved: !!financial_details_approved,
      financial_details_approved_by: financial_details_approved
        ? (financial_details_approved_by || "")
        : "",
    };

    const updatedKyc = await CustomerKycModel.findByIdAndUpdate(
      _id,
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    if (!updatedKyc) {
      return res.status(404).json({ message: "Customer KYC record not found" });
    }

    res.status(200).json({
      message: financial_details_approved
        ? "Financial details approved successfully"
        : "Financial details approval removed",
      data: updatedKyc,
    });
  } catch (error) {
    console.error("Error updating financial details approval:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

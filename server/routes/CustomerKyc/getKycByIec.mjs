import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

router.get("/api/get-customer-kyc-by-iec/:iec_no", async (req, res) => {
  const { iec_no } = req.params;

  try {
    if (!iec_no) {
      return res.status(400).json({ error: "IEC number is required" });
    }

    const data = await CustomerKycModel.findOne({ iec_no: iec_no.toUpperCase() });

    if (!data) {
      return res.status(404).json({ error: "Customer KYC details not found for this IEC" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching customer KYC details by IEC:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

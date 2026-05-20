import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

router.post("/api/add-customer-kyc", async (req, res) => {
  const { iec_no, ...rest } = req.body;

  if (!iec_no) {
    return res.status(400).json({ message: "IEC number is required" });
  }

  // Normalize IEC number to uppercase and trim spaces
  const normalizedIecNo = iec_no.trim().toUpperCase();

  // Add the draft field to the rest object
  const kycData = { ...rest, iec_no: normalizedIecNo, draft: "false" };

  try {
    const existingKyc = await CustomerKycModel.findOne({ iec_no: normalizedIecNo });

    if (existingKyc) {
      // Update existing KYC
      Object.assign(existingKyc, kycData);
      await existingKyc.save();
      res.status(200).json({ message: "KYC details updated successfully" });
    } else {
      // Create new KYC
      const newKyc = new CustomerKycModel({ iec_no: normalizedIecNo, ...kycData });
      await newKyc.save();
      res.status(201).json({ message: "KYC details added successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

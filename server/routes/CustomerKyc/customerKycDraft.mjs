import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

router.post("/api/customer-kyc-draft", async (req, res) => {
  const { iec_no, name_of_individual, ...rest } = req.body;

  // Validate minimum required fields for draft
  if (!iec_no) {
    return res.status(400).json({ message: "IEC number is required to save draft" });
  }
  
  if (!name_of_individual || name_of_individual.trim() === "") {
    return res.status(400).json({ message: "Name is required to save draft" });
  }

  try {
    const existingKyc = await CustomerKycModel.findOne({ iec_no });

    if (existingKyc) {
      Object.assign(existingKyc, rest, { draft: "true" });
      await existingKyc.save();
      res.status(200).json({ message: "KYC details updated successfully" });
    } else {
      const kycData = Object.assign({}, req.body);
      const newKyc = new CustomerKycModel(kycData);
      await newKyc.save();
      res.status(201).json({ message: "KYC details added successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

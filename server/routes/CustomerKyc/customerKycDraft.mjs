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

  // Normalize IEC number to uppercase and trim spaces
  const normalizedIecNo = iec_no.trim().toUpperCase();

  try {
    const existingKyc = await CustomerKycModel.findOne({ iec_no: normalizedIecNo });

    if (existingKyc) {
      // Update existing draft without triggering strict schema validation (since it is a draft)
      Object.assign(existingKyc, rest, { iec_no: normalizedIecNo, draft: "true" });
      await existingKyc.save({ validateBeforeSave: false });
      res.status(200).json({ message: "KYC details updated successfully" });
    } else {
      // Create a new draft and bypass schema validation (e.g. required 'status')
      const kycData = Object.assign({}, req.body, { iec_no: normalizedIecNo, draft: "true" });
      const newKyc = new CustomerKycModel(kycData);
      await newKyc.save({ validateBeforeSave: false });
      res.status(201).json({ message: "KYC details added successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

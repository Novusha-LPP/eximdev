import express from "express";
import JobModel from "../../model/jobModel.mjs";
import kycDocumentsModel from "../../model/kycDocumentsModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.patch("/api/update-do-list", auditMiddleware('Job'), async (req, res, next) => {
  const {
    _id,
    shipping_line_bond_completed,
    shipping_line_kyc_completed,
    shipping_line_invoice_received,
    shipping_line_insurance,
    kyc_documents,
    kyc_valid_upto,
    shipping_line_bond_valid_upto,
    shipping_line_bond_docs,
    shipping_line_bond_charges,
    // ADD THESE MISSING FIELDS
    do_shipping_line_invoice,
    insurance_copy,
    other_do_documents,
    security_deposit,
    do_copies
  } = req.body;

  try {
    const currentDate = new Date().toLocaleDateString("en-GB");

    // Fetch the existing job document
    const existingJob = await JobModel.findOne({ _id });

    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

  
    // Create an object to hold the fields to update - INCLUDE ALL FIELDS
    const updateFields = {
      // ADD THE MISSING DOCUMENT FIELDS
      do_shipping_line_invoice,
      insurance_copy,
      other_do_documents,
      security_deposit,
    };

    // Update Job document - THIS WILL NOW UPDATE ALL FIELDS
    await JobModel.updateOne({ _id }, { $set: updateFields });

    // Find the existing KYC document
    const existingKycDoc = await kycDocumentsModel.findOne({
      importer: existingJob.importer,
      shipping_line_airline: existingJob.shipping_line_airline,
    });

    if (existingKycDoc) {
      // Update the existing KYC document
      await kycDocumentsModel.updateOne(
        { _id: existingKycDoc._id },
        {
          $set: {
            importer: existingJob.importer,
            shipping_line_airline: existingJob.shipping_line_airline,
            kyc_documents,
            kyc_valid_upto,
            shipping_line_bond_valid_upto,
            shipping_line_bond_docs,
            shipping_line_bond_charges,
          },
        }
      );
    } else {
      // Add a new KYC document
      const newKycDoc = new kycDocumentsModel({
        importer: existingJob.importer,
        shipping_line_airline: existingJob.shipping_line_airline,
        kyc_documents,
        kyc_valid_upto,
        shipping_line_bond_valid_upto,
        shipping_line_bond_docs,
        shipping_line_bond_charges,
      });
      await newKycDoc.save();
    }

    return res.json({ success: true, message: "Details submitted" });
  } catch (error) {
    console.error("Error updating DO list:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

import express from "express";
const router = express.Router();
import JobModel from "../../model/jobModel.mjs";
import kycDocumentsModel from "../../model/kycDocumentsModel.mjs";

router.post("/api/update-do-list", async (req, res) => {
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
  } = req.body;

  try {
    const currentDate = new Date().toLocaleDateString("en-GB"); // Get current date in dd-mm-yyyy format

    // Fetch the existing job document
    const existingJob = await JobModel.findOne({ _id });

    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Check if any of the boolean fields are already 'Yes' in the database
    const shouldUpdateBondDate =
      existingJob.shipping_line_bond_completed !== "Yes";
    const shouldUpdateKYCDate =
      existingJob.shipping_line_kyc_completed !== "Yes";
    const shouldUpdateInvoiceDate =
      existingJob.shipping_line_invoice_received !== "Yes";

    // Create an object to hold the fields to update
    const updateFields = { shipping_line_insurance: shipping_line_insurance };

    // Update date fields based on conditions
    if (shouldUpdateBondDate && shipping_line_bond_completed === "Yes") {
      updateFields.shipping_line_bond_completed_date = currentDate;
    }
    if (shouldUpdateKYCDate && shipping_line_kyc_completed === "Yes") {
      updateFields.shipping_line_kyc_completed_date = currentDate;
    }
    if (shouldUpdateInvoiceDate && shipping_line_invoice_received === "Yes") {
      updateFields.shipping_line_invoice_received_date = currentDate;
    }

    // Update Job document if there are fields to be updated
    if (Object.keys(updateFields).length > 0) {
      await JobModel.updateOne({ _id }, { $set: updateFields });
    }

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
      });
      await newKycDoc.save();
    }

    return res.json({ success: true, message: "Details submitted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

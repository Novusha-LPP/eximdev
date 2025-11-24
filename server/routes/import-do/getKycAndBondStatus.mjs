import express from "express";
import JobModel from "../../model/jobModel.mjs";
import kycDocumentsModel from "../../model/kycDocumentsModel.mjs";

const router = express.Router();

router.get("/api/get-kyc-and-bond-status/:_id", async (req, res) => {
  const { _id } = req.params;

  // Find the job by its _id
  const job = await JobModel.findOne({ _id });

  // If job is not found, return a 200 response with a "Data not found" message
  if (!job) {
    return res.status(200).json({ message: "Data not found" });
  }

  const { importer, shipping_line_airline, job_no, awb_bl_no } = job;

  // Find the KYC documents based on importer and shipping line/airline
  const kycDocs = await kycDocumentsModel.findOne({
    importer,
    shipping_line_airline,
  });

  // Determine the status of KYC and bond completion
  const shipping_line_kyc_completed =
    kycDocs?.kyc_documents?.length > 0 ? "Yes" : "No";
  const shipping_line_bond_completed =
    kycDocs?.shipping_line_bond_docs?.length > 0 ? "Yes" : "No";

  // Return the response with additional fields
  res.status(200).json({
    job_no,
    importer,
    awb_bl_no,
    shipping_line_kyc_completed,
    shipping_line_bond_completed,
    shipping_line_invoice_received: job.shipping_line_invoice_received || "No",
    kyc_documents: kycDocs?.kyc_documents || [],
    kyc_valid_upto: kycDocs?.kyc_valid_upto || "",
    shipping_line_bond_valid_upto: kycDocs?.shipping_line_bond_valid_upto || "",
    shipping_line_bond_docs: kycDocs?.shipping_line_bond_docs || [],
    shipping_line_bond_charges: kycDocs?.shipping_line_bond_charges || "",
    shipping_line_insurance: job.shipping_line_insurance || [],
  });
});

export default router;

import express from "express";
import JobModel from "../../model/jobModel.mjs";
import kycDocumentsModel from "../../model/kycDocumentsModel.mjs";

const router = express.Router();

router.get("/api/get-kyc-and-bond-status/:_id", async (req, res) => {
  const { _id } = req.params;

  const job = await JobModel.findOne({ _id });
  if (!job) {
    return res.status(200).json({ message: "Data not found" });
  }

  const importer = job.importer;
  const shipping_line_airline = job.shipping_line_airline;

  const kycDocs = await kycDocumentsModel.findOne({
    importer,
    shipping_line_airline,
  });

  const shipping_line_kyc_completed =
    kycDocs?.kyc_documents?.length > 0 ? "Yes" : "No";
  const shipping_line_bond_completed =
    kycDocs?.shipping_line_bond_docs?.length > 0 ? "Yes" : "No";
  res.status(200).json({
    shipping_line_kyc_completed,
    shipping_line_bond_completed,
  });
});

export default router;

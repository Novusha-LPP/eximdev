import express from "express";
import JobModel from "../model/jobModel.mjs";
import authApiKey from "../middleware/authApiKey.mjs";

const router = express.Router();

/**
 * @api {get} /api/tally/job-data Retrieve job data for Tally integration
 * @apiHeader {String} x-api-key API Key for external authentication
 * @apiParam {String} job_number Job Number (unique/structured)
 * @apiParam {String} year Financial Year
 */
router.get("/api/tally/job-data", authApiKey, async (req, res) => {
  try {
    const { job_number, year } = req.query;

    if (!job_number || !year) {
      return res.status(400).send({ error: "job_number and year are required query parameters" });
    }

    // Find the job by job_number and year
    const job = await JobModel.findOne({ job_number, year }).lean();

    if (!job) {
      return res.status(404).send({ error: "Job not found for the provided job_number and year" });
    }

    // Map fields according to user request and mapping analysis
    const responseData = {
      "Job Number": job.job_number || "",
      "Job Type": job.trade_type || "",
      "BE No": job.be_no || "",
      "BE Date": job.be_date || "",
      "BE Type": job.type_of_b_e || "",
      "MBL NO": job.awb_bl_no || "",
      "MBL Date": job.awb_bl_date || "",
      "HBL No": job.hawb_hbl_no || "",
      "HBL Date": job.hawb_hbl_date || "",
      "Consignment Type": job.consignment_type || "",
      "Packages": job.no_of_pkgs || "",
      "Gross Weight": job.gross_weight || "",
      "Net Wt.": job.job_net_weight || "",
      "Custom House": job.custom_house || "",
      "Vessel": job.vessel_flight || "", // User requested to use vessel_flight
      "Voyage": job.voyage_no || "",
      "Origin Port": job.loading_port || "",
      "Customer Ref.": "", // User requested to keep blank
      "Invoice Number": job.invoice_number || "",
      "Inv Date": job.invoice_date || "",
      "Terms of Invoice": job.toi || "",
      "Invoice Value": job.total_inv_value || "",
      "CIF Value": job.cif_amount || "",
      "Assess Value": job.assbl_value || job.assessable_ammount || "",
      "Total Duty": job.total_duty || "",
      "Shipper Name": job.supplier_exporter || "",
      "BE Heading": job.description || "",
      "No. of Containers": job.no_of_container || "",
      "Importer Name": job.importer || "",
      "Containers": (job.container_nos || []).map(c => c.container_number).join(", "),
      "Status": "" // User requested to keep blank
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Tally API Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

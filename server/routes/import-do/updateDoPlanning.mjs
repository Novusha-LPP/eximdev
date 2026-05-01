import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
const router = express.Router();

// Extract job info middleware for audit trail
const extractJobInfo = async (req, res, next) => {
  try {
    if (req.body._id) {
      // Fetch job details to get job_no and year
      const job = await JobModel.findOne({ _id: req.body._id }).lean();
      if (job) {
        req.jobInfo = {
          documentId: job._id,
          job_no: job.job_no,
          year: job.year
        };
      } else {
        console.log(`❌ Could not find job with ID: ${req.body._id}`);
      }
    }
    next();
  } catch (error) {
    console.error("❌ Error extracting job info:", error);
    next(); // Continue even if extraction fails
  }
};

router.patch("/api/update-do-planning", extractJobInfo, auditMiddleware("Job"), async (req, res) => {
  try {

    const currentDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Fetch the existing job document
    const existingJob = await JobModel.findOne({ _id: req.body._id });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Explicitly listing fields that can be updated from DO Planning module
    const allowedUpdateFields = [
      "do_validity",
      "do_processed",
      "do_completed",
      "do_documents",
      "do_copies",
      "do_list",
      "shipping_line_invoice",
      "shipping_line_invoice_date",
      "shipping_line_invoice_imgs",
      "other_invoices",
      "payment_made",
      "security_deposit",
      "security_amount",
      "utr",
      "do_queries",
      "do_Revalidation_Completed",
      "container_nos",
      "is_do_doc_recieved",
      "do_doc_recieved_date",
      "do_shipping_line_invoice",
      "insurance_copy",
      "other_do_documents",
      "dsr_queries",
      "icd_cfs_invoice",
      "icd_cfs_invoice_img",
      "other_invoices_img",
      "thar_invoices",
      "hasti_invoices",
      "concor_invoice_and_receipt_copy"
    ];

    const updateFields = {
      kyc_date: currentDate,
      payment_made_date: currentDate,
      do_processed_date: currentDate,
      shipping_line_invoice_date: currentDate,
      other_invoices_date: currentDate,
    };

    // Only update fields that are explicitly allowed
    allowedUpdateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    // Handle nested object sanitization: if any address fields are accidentally sent as strings, 
    // the JobModel pre-validate hook will handle them, but we've already 
    // excluded them from updateFields here as a first line of defense.

    // Update fields on the existing document
    Object.assign(existingJob, updateFields);

    // Save the updated job document
    await existingJob.save();

    return res.json({ message: "Details submitted succesfully." });
  } catch (error) {
    console.error("❌ Error updating DO Planning:", error);
    // Return specific validation error message if available
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        error: "Validation Failed", 
        details: error.message 
      });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

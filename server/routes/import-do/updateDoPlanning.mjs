import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
const router = express.Router();

// Extract job info middleware for audit trail
const extractJobInfo = async (req, res, next) => {
  try {
    console.log("🔍 Extracting job info for DO Planning update:", req.body._id);
    if (req.body._id) {
      // Fetch job details to get job_no and year
      const job = await JobModel.findOne({ _id: req.body._id }).lean();
      if (job) {
        req.jobInfo = {
          documentId: job._id,
          job_no: job.job_no,
          year: job.year
        };
        console.log(`✅ Extracted job info for audit trail: ${job.year}/${job.job_no}`);
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
    console.log("📝 Processing DO Planning update with user:", req.headers["username"] || "unknown");
    
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

    const updateFields = {
      ...req.body,
      kyc_date: currentDate,
      payment_made_date: currentDate,
      do_processed_date: currentDate,
      shipping_line_invoice_date: currentDate,
      other_invoices_date: currentDate,
      do_validity: req.body.do_validity,
      do_processed: req.body.do_processed,
    };

    // Update fields
    Object.assign(existingJob, updateFields);

    // Save the updated job document
    await existingJob.save();

    return res.json({ message: "Details submitted" });
  } catch (error) {
    console.error("❌ Error updating DO Planning:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

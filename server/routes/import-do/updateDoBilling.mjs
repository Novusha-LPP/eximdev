import express from "express";
import JobModel from "../../model/jobModel.mjs"; // Import your JobModel
import auditMiddleware from "../../middleware/auditTrail.mjs"; // Import audit middleware

const router = express.Router();

// Extract job info middleware for audit trail
const extractJobInfo = async (req, res, next) => {
  try {
    if (req.params.id) {
      // Fetch job details to get job_no and year
      const job = await JobModel.findOne({ _id: req.params.id }).lean();
      if (job) {
        req.jobInfo = {
          documentId: job._id,
          job_no: job.job_no,
          year: job.year
        };
      } else {
        console.log(`❌ Could not find job with ID: ${req.params.id}`);
      }
    }
    next();
  } catch (error) {
    console.error("❌ Error extracting job info:", error);
    next(); // Continue even if extraction fails
  }
};

// PATCH route for updating billing details
router.patch(
  "/api/update-do-billing/:id",
  extractJobInfo,
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const jobId = req.params.id;
      const updateData = req.body;

      // ✅ Allowed fields for DO Billing update
      const allowedUpdates = [
        "icd_cfs_invoice",
        "icd_cfs_invoice_img",
        "other_invoices_img",
        "shipping_line_invoice_imgs",
        "bill_document_sent_to_accounts",
        "dsr_queries", // ✅ allow updating dsr_queries from billing stage too
        "thar_invoices",
        "hasti_invoices",
        
      ];

      // Validate fields sent by client
      const actualUpdates = Object.keys(updateData);
      const isValidOperation = actualUpdates.every((field) =>
        allowedUpdates.includes(field)
      );

      if (!isValidOperation) {
        return res.status(400).json({
          success: false,
          message: "Invalid updates detected.",
          invalidFields: actualUpdates.filter((f) => !allowedUpdates.includes(f))
        });
      }

      // Perform update in one go
      const updatedJob = await JobModel.findByIdAndUpdate(
        jobId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedJob) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Billing details updated successfully",
        updatedJob,
      });
    } catch (error) {
      console.error("❌ Error updating billing details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);


export default router;

import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

import { invalidateJobCache } from "../import-dsr/getJobList.mjs";
import { invalidateJobTabCountsCache } from "../import-dsr/getJobTabCounts.mjs";

const router = express.Router();

router.patch(
  "/api/update-submission-job/:branch_code/:trade_type/:mode/:job_no/:year",
  authMiddleware,
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const { branch_code, trade_type, mode, job_no, year } = req.params;
      const updateData = req.body; // Data coming from frontend

      // Allowed fields in this route
      const allowedUpdates = [
        "be_no",
        "be_date",
        "checklist",
        "verified_checklist_upload_date_and_time",
        "submission_completed_date_time",
        "job_sticker_upload",
        "job_sticker_upload_date_and_time",
        "submissionQueries", // existing array for submissions
        "dsr_queries" // ✅ NEW - allow updating dsr_queries too!
      ];

      // Check for invalid fields
      const actualUpdates = Object.keys(updateData);
      const isValidOperation = actualUpdates.every((field) =>
        allowedUpdates.includes(field)
      );

      if (!isValidOperation) {
        return res
          .status(400)
          .json({ message: "Invalid updates detected.", invalidFields: actualUpdates.filter((field) => !allowedUpdates.includes(field)) });
      }

      // Find the job document with uppercase params
      const query = {
        branch_code: branch_code.toUpperCase(),
        trade_type: trade_type.toUpperCase(),
        mode: mode.toUpperCase(),
        job_no,
        year,
      };
      const job = await JobModel.findOne(query);

      if (!job) {
        return res.status(404).json({ message: "Job not found." });
      }

      // Apply updates and trigger pre("save") hook to compute detailed_status, row_color, and status_rank
      Object.assign(job, updateData);
      await job.save();

      if (job.year) {
        invalidateJobCache(job.year);
      } else {
        invalidateJobCache();
      }
      invalidateJobTabCountsCache();

      res.json({
        message: "Job updated successfully.",
        job,
      });
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Internal server error.", error: error.message });
    }
  }
);


export default router;

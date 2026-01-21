import express from "express";
// JobModel is now attached to req by branchJobMiddleware
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.patch(
  "/api/update-submission-job/:id",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
      const JobModel = req.JobModel;

      const jobId = req.params.id;
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

      // Perform update with only allowed fields
      const updatedJob = await JobModel.findByIdAndUpdate(
        jobId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedJob) {
        return res.status(404).json({ message: "Job not found." });
      }

      res.json({
        message: "Job updated successfully.",
        job: updatedJob,
      });
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Internal server error.", error: error.message });
    }
  }
);


export default router;

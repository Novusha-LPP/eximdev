import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.patch("/api/update-submission-job/:id", 
  auditMiddleware('Job'),
  async (req, res) => {
  try {
    const jobId = req.params.id;
    const updateData = req.body; // Contains the fields to be updated

    // Optional: Validate the incoming data to prevent unwanted fields
    const allowedUpdates = [
      "be_no",
      "be_date",
      "checklist",
      "verified_checklist_upload_date_and_time",
      "submission_completed_date_time",
      "job_sticker_upload",
      "job_sticker_upload_date_and_time",
    ];

    const actualUpdates = Object.keys(updateData);
    const isValidOperation = actualUpdates.every((field) =>
      allowedUpdates.includes(field)
    );

    if (!isValidOperation) {
      return res.status(400).json({ message: "Invalid updates detected." });
    }

    // Log audit information
    console.log('📊 Submission update request:', {
      jobId,
      userId: req.headers['user-id'],
      username: req.headers['username'],
      role: req.headers['user-role'],
      fields: Object.keys(updateData)
    });

    // Perform the update
    const updatedJob = await JobModel.findByIdAndUpdate(
      jobId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found." });
    }

    console.log(`✅ Submission job ${updatedJob.job_no}/${updatedJob.year} updated successfully`);
    res.json({
      message: "Job updated successfully.",
      job: updatedJob,
    });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;

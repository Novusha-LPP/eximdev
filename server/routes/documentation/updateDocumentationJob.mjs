import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.post("/api/update-documentation-job", async (req, res) => {
  try {
    const { job_no, year, document_entry_completed, documentationQueries } =
      req.body;

    // Find the matching job based on job number and year
    const matchingJob = await JobModel.findOne({ job_no, year });

    if (matchingJob) {
      // Update the fields with the new values
      matchingJob.document_entry_completed = document_entry_completed;
      matchingJob.documentationQueries = documentationQueries;

      // Save the updated job document back to the database
      await matchingJob.save();

      // Respond with a success message
      res.status(200).json({ message: "Job updated successfully" });
    } else {
      // If no matching job is found, respond with an error
      res.status(200).json({ message: "Job not found" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the job" });
  }
});

export default router;

import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.post("/api/update-submission-job", async (req, res) => {
  try {
    const {
      job_no,
      year,
      submission_date,
      submissionQueries,
      checklist_verified_on,
    } = req.body;

    const matchingJob = await JobModel.findOne({ job_no, year });
    if (matchingJob) {
      matchingJob.submission_date = submission_date;
      matchingJob.submissionQueries = submissionQueries;
      matchingJob.checklist_verified_on = checklist_verified_on;
      await matchingJob.save();
      res.status(200).json({ message: "Job updated successfully" });
    } else {
      res.status(200).json({ message: "Job not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

import express from "express";
import { getJobModel } from "../../model/jobModelFactory.mjs";

const router = express.Router();

router.get("/api/get-job/:job_no", async (req, res) => {
  const JobModel = req.JobModel;

  try {
    const { job_no } = req.params; // Changed from jobNo, year to job_no

    const job = await JobModel.findOne({
      job_no: job_no,
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;

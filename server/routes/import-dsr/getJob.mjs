import express from "express";
import { getJobModel } from "../../model/jobModelFactory.mjs";

const router = express.Router();

router.get("/api/get-job/:year/:jobNo", async (req, res) => {
    const JobModel = getJobModel(req.headers['x-branch'], req.headers['x-category']);

  try {
    const { jobNo, year } = req.params;

    const job = await JobModel.findOne({
      year,
      job_no: jobNo,
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

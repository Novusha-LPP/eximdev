import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-job/:year/:jobNo",authenticateJWT, async (req, res) => {
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

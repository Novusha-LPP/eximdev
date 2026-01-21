import express from "express";

const router = express.Router();

router.get("/api/get-job/:year/:jobNo", async (req, res) => {
  try {
    const { jobNo, year } = req.params;

    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

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

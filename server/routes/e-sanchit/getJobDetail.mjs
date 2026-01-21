import express from "express";
// JobModel is now attached to req by branchJobMiddleware

const router = express.Router();

router.get("/api/get-esanchit-job/:job_no/:year", async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const { job_no, year } = req.params;
    const data = await JobModel.findOne({ job_no, year });
    if (!data) {
      return res.status(404).send("Data not found");
    }
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving data");
  }
});

export default router;

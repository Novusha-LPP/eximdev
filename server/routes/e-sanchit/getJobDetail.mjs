import express from "express";
import { getJobModel } from "../../model/jobModelFactory.mjs";

const router = express.Router();

router.get("/api/get-e-sanchit-job-detail/:id", async (req, res) => {
  const JobModel = req.JobModel;

  const { job_no, year } = req.params;
  try {
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

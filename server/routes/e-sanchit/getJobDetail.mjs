import express from "express";
import { getJobModel } from "../../model/jobModelFactory.mjs";

const router = express.Router();

router.get("/api/get-esanchit-job/:job_no/:year", async (req, res) => {
    const JobModel = getJobModel(req.headers['x-branch'], req.headers['x-category']);

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

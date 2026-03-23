import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-esanchit-job/:branch_code/:mode/:job_no/:year", async (req, res) => {
  const { branch_code, mode, job_no, year } = req.params;
  try {
    const data = await JobModel.findOne({ branch_code, mode: mode.toUpperCase(), job_no, year });
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

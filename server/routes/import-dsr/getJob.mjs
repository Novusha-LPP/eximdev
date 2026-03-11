import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-job/:branch_code/:trade_type/:mode/:year/:jobNo", async (req, res) => {
  try {
    const { branch_code, trade_type, mode, jobNo, year } = req.params;

    const job = await JobModel.findOne({
      branch_code: branch_code.toUpperCase(),
      trade_type: trade_type.toUpperCase(),
      mode: mode.toUpperCase(),
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

router.get("/api/get-job/:mode/:year/:jobNo", async (req, res) => {
  try {
    const { mode, jobNo, year } = req.params;

    const job = await JobModel.findOne({
      mode: mode.toUpperCase(),
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

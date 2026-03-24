import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.patch("/api/update-documentation-job/:branch_code/:trade_type/:mode/:job_no/:year", auditMiddleware('Job'), async (req, res) => {
  try {
    const { branch_code, trade_type, mode, job_no, year } = req.params;
    const { documentation_completed_date_time, dsr_queries } = req.body;
    const job = await JobModel.findOne({ branch_code, trade_type, mode: mode.toUpperCase(), job_no, year });

    if (job) {
      if (typeof documentation_completed_date_time !== 'undefined') {
        job.documentation_completed_date_time = documentation_completed_date_time;
      }
      if (Array.isArray(dsr_queries)) {
        job.dsr_queries = dsr_queries;
      }
      await job.save();
      res.status(200).json({ message: "Job updated successfully", job });
    } else {
      res.status(404).json({ message: "Job not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occurred while updating the job" });
  }
});

export default router;

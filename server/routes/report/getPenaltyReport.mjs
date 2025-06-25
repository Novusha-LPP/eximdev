import express from "express";
import JobModel from "../../model/jobModel.mjs";
import logger from "../../logger.js";

const router = express.Router();

router.get("/api/report/penalty", async (req, res) => {
  try {
    // Get all jobs and filter in JavaScript for better control
    const jobs = await JobModel.find({})
    .select("job_no importer intrest_ammount fine_ammount penalty_ammount")
    .sort({ job_no: 1 });

    // Filter jobs where any of the three fields has value > 1
    const filteredJobs = jobs.filter(job => {
      const interest = parseFloat(job.intrest_ammount) || 0;
      const fine = parseFloat(job.fine_ammount) || 0;
      const penalty = parseFloat(job.penalty_ammount) || 0;
      
      return interest > 1 || fine > 1 || penalty > 1;
    });

    // Transform the data to ensure all three fields are always shown
    const responseData = filteredJobs.map(job => ({
      job_no: job.job_no,
      importer: job.importer,
      intrest_ammount: job.intrest_ammount || "0",
      fine_ammount: job.fine_ammount || "0", 
      penalty_ammount: job.penalty_ammount || "0",
      // Optional: Add calculated totals
      total_penalty: (
        (parseFloat(job.intrest_ammount) || 0) + 
        (parseFloat(job.fine_ammount) || 0) + 
        (parseFloat(job.penalty_ammount) || 0)
      ).toFixed(2)
    }));

    logger.info(`Penalty report fetched successfully. Found ${responseData.length} jobs with penalties > 1.`);
    
    res.status(200).json({
      success: true,
      data: responseData,
      count: responseData.length,
      summary: {
        total_jobs: responseData.length,
        total_interest: responseData.reduce((sum, job) => sum + (parseFloat(job.intrest_ammount) || 0), 0).toFixed(2),
        total_fine: responseData.reduce((sum, job) => sum + (parseFloat(job.fine_ammount) || 0), 0).toFixed(2),
        total_penalty: responseData.reduce((sum, job) => sum + (parseFloat(job.penalty_ammount) || 0), 0).toFixed(2)
      }
    });
  } catch (error) {
    logger.error("Error fetching penalty report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching penalty report",
      error: error.message
    });
  }
});

export default router;
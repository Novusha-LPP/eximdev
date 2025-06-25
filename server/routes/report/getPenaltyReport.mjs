import express from "express";
import JobModel from "../../model/jobModel.mjs";
import logger from "../../logger.js";

const router = express.Router();

router.get("/api/report/penalty", async (req, res) => {
  try {    // Find jobs where any of the penalty fields have a value greater than 0
    const jobs = await JobModel.find({
      $or: [
        { intrest_ammount: { $exists: true, $ne: "", $ne: "0", $ne: null } },
        { fine_ammount: { $exists: true, $ne: "", $ne: "0", $ne: null } },
        { penalty_ammount: { $exists: true, $ne: "", $ne: "0", $ne: null } }
      ]
    })
    .select("job_no importer intrest_ammount fine_ammount penalty_ammount")
    .sort({ job_no: 1 });

    // Filter out jobs where all penalty fields are "0" or empty
    const filteredJobs = jobs.filter(job => {
      const interest = parseFloat(job.intrest_ammount) || 0;
      const fine = parseFloat(job.fine_ammount) || 0;
      const penalty = parseFloat(job.penalty_ammount) || 0;
      
      return interest > 0 || fine > 0 || penalty > 0;
    });

    logger.info(`Penalty report fetched successfully. Found ${filteredJobs.length} jobs with penalties.`);
    
    res.status(200).json({
      success: true,
      data: filteredJobs,
      count: filteredJobs.length
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

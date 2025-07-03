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

    // Sort jobs based on penalty type priority
    const sortedJobs = filteredJobs.sort((a, b) => {
      const aInterest = parseFloat(a.intrest_ammount) || 0;
      const aFine = parseFloat(a.fine_ammount) || 0;
      const aPenalty = parseFloat(a.penalty_ammount) || 0;
      
      const bInterest = parseFloat(b.intrest_ammount) || 0;
      const bFine = parseFloat(b.fine_ammount) || 0;
      const bPenalty = parseFloat(b.penalty_ammount) || 0;
      
      // Create priority scores based on which penalty types exist
      const getPriorityScore = (interest, fine, penalty) => {
        const hasInterest = interest > 0;
        const hasFine = fine > 0;
        const hasPenalty = penalty > 0;
        
        // Priority order (lower score = higher priority):
        // 1. All three (penalty + fine + interest)
        // 2. Penalty + fine
        // 3. Penalty + interest
        // 4. Fine + interest
        // 5. Penalty only
        // 6. Fine only
        // 7. Interest only
        
        if (hasPenalty && hasFine && hasInterest) return 1;
        if (hasPenalty && hasFine && !hasInterest) return 2;
        if (hasPenalty && !hasFine && hasInterest) return 3;
        if (!hasPenalty && hasFine && hasInterest) return 4;
        if (hasPenalty && !hasFine && !hasInterest) return 5;
        if (!hasPenalty && hasFine && !hasInterest) return 6;
        if (!hasPenalty && !hasFine && hasInterest) return 7;
        
        return 8; // Should not reach here due to filtering
      };
      
      const aPriority = getPriorityScore(aInterest, aFine, aPenalty);
      const bPriority = getPriorityScore(bInterest, bFine, bPenalty);
      
      // If same priority, sort by job_no
      if (aPriority === bPriority) {
        return a.job_no.localeCompare(b.job_no);
      }
      
      return aPriority - bPriority;
    });

    logger.info(`Penalty report fetched successfully. Found ${sortedJobs.length} jobs with penalties.`);
    
    res.status(200).json({
      success: true,
      data: sortedJobs,
      count: sortedJobs.length
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

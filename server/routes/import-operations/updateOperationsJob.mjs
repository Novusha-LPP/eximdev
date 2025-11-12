import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { determineDetailedStatus } from "../../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../../utils/statusColorMapper.mjs";

const router = express.Router();

// The job_no and year are already available in the URL params,
// so we just need to attach them to req.jobInfo for the audit middleware
const extractJobInfo = async (req, res, next) => {
  try {
    const { year, job_no } = req.params;
    
    // Find the job to get its document ID
    const job = await JobModel.findOne({ job_no, year }).lean();
    if (job) {
      req.jobInfo = {
        documentId: job._id,
        job_no,
        year
      };
    } else {
      console.log(`❌ Could not find job: ${year}/${job_no}`);
    }
    next();
  } catch (error) {
    console.error('❌ Error extracting job info:', error);
    next(); // Continue even if extraction fails
  }
};

router.patch("/api/update-operations-job/:year/:job_no", extractJobInfo, auditMiddleware("Job"), async (req, res) => {
  const { year, job_no } = req.params;
  const updateData = req.body;

  try {
    // SECURITY CHECK: If container_nos is being updated, validate they belong to this job
    if (updateData.container_nos && Array.isArray(updateData.container_nos)) {
      const existingJob = await JobModel.findOne({ year, job_no }).select('container_nos');
      
      if (existingJob && existingJob.container_nos) {
        const existingContainerNumbers = new Set(
          existingJob.container_nos.map(c => c.container_number)
        );
        const incomingContainerNumbers = new Set(
          updateData.container_nos.map(c => c.container_number)
        );
        
        // Check if incoming containers don't match existing containers
        const hasInvalidContainers = Array.from(incomingContainerNumbers).some(
          containerNum => !existingContainerNumbers.has(containerNum)
        );
        
        if (hasInvalidContainers) {
          console.error('SECURITY ALERT: Cross-job container contamination detected!', {
            year,
            job_no,
            existingContainers: Array.from(existingContainerNumbers),
            incomingContainers: Array.from(incomingContainerNumbers)
          });
          
          return res.status(400).json({
            message: "Container validation failed: Submitted containers do not match job containers",
            error: "Data integrity violation detected"
          });
        }
      }
    }

    // Apply the requested update first
    await JobModel.findOneAndUpdate({ year, job_no }, { $set: updateData });

    // Fetch the updated job and recompute detailed_status server-side
    let job = await JobModel.findOne({ year, job_no }).lean();
    if (!job) {
      return res.status(200).send({ message: "Job not found" });
    }

    const recomputedStatus = determineDetailedStatus(job);
    const rowColor = getRowColorFromStatus(recomputedStatus || job.detailed_status);

    if (recomputedStatus && recomputedStatus !== job.detailed_status) {
      job = await JobModel.findOneAndUpdate(
        { year, job_no },
        { $set: { detailed_status: recomputedStatus, row_color: rowColor } },
        { new: true }
      ).lean();
    } else if (rowColor !== job.row_color) {
      job = await JobModel.findOneAndUpdate({ year, job_no }, { $set: { row_color: rowColor } }, { new: true }).lean();
    }

    res.status(200).send({
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "An error occurred while updating the job",
    });
  }
});

export default router;

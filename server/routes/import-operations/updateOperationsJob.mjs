import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

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
    const job = await JobModel.findOneAndUpdate(
      { year, job_no },
      { $set: updateData }, // $set is used to update only the fields provided
      {
        new: true,
        runValidators: true,
      }
    );

    if (!job) {
      return res.status(200).send({ message: "Job not found" });
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

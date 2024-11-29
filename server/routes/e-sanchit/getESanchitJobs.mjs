import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-esanchit-jobs", async (req, res) => {
  try {
    const data = await JobModel.find({
      $and: [
        { status: { $regex: /^pending$/i } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        { job_no: { $ne: null } },
        {
          $or: [
            { esanchit_completed_date_time: { $exists: false } }, // Field does not exist
            { esanchit_completed_date_time: "" }, // Field is an empty string
            {
              "cth_documents.document_check_date": "", // Any document_check_date is an empty string
            },
          ],
        },
      ],
    }).select(
      "job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents consignment_type type_of_b_e awb_bl_date awb_bl_no container_nos"
    );

    if (!data || data.length === 0) {
      // Check if data is empty
      return res.status(404).json({ message: "Data not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching data:", err); // Improved logging
    res.status(500).json({ message: "Internal server error" });
  }
});
// PATCH endpoint for updating E-Sanchit jobs
router.patch("/api/update-esanchit-job/:job_no/:year", async (req, res) => {
  const { job_no, year } = req.params;
  const { cth_documents, queries, esanchit_completed_date_time } = req.body;

  try {
    // Find the job by job_no and year
    const job = await JobModel.findOne({ job_no, year });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Update fields only if provided
    if (cth_documents) {
      job.cth_documents = cth_documents;
    }

    if (queries) {
      job.eSachitQueries = queries;
    }

    // Update esanchit_completed_date_time only if it exists in the request
    if (esanchit_completed_date_time !== undefined) {
      job.esanchit_completed_date_time = esanchit_completed_date_time || null; // Set to null if cleared
    }

    // Save the updated job
    await job.save();

    res.status(200).json({ message: "Job updated successfully", job });
  } catch (err) {
    console.error("Error updating job:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

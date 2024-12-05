import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-submission-jobs", async (req, res) => {
  try {
    const data = await JobModel.find({
      $and: [
        { status: { $regex: /^pending$/i } }, // Status is "Pending" (case-insensitive)
        { job_no: { $ne: null } }, // job_no is not null
        {
          $or: [
            { be_no: { $exists: false } }, // be_no does not exist
            { be_no: "" }, // be_no is an empty string
          ],
        },
        { esanchit_completed_date_time: { $exists: true, $ne: "" } }, // esanchit_completed_date_time exists and is not empty
        { documentation_completed_date_time: { $exists: true, $ne: "" } }, // documentation_completed_date_time exists and is not empty
        
      ],
    }).select(
      "job_no year type_of_b_e consignment_type custom_house gateway_igm_date gateway_igm igm_no igm_date invoice_number invoice_date awb_bl_no awb_bl_date importer container_nos"
    );

    // If no jobs match the criteria, return a 404 response
    if (!data || data.length === 0) {
      return res.status(202).json({ message: "No jobs found" });
    }

    // Return the matching jobs
    res.status(200).json(data);
  } catch (error) {
    // Handle server errors
    console.error("Error fetching jobs:", error); // Logging error for debugging
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;

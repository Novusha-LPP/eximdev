import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Endpoint to fetch documentation jobs with specific filters
router.get("/api/get-documentation-jobs", async (req, res) => {
  try {
    // Query to filter jobs with status 'Pending' (case insensitive), specific detailed_status values,
    // and where documentation_completed_date_time does not exist or is empty
    const data = await JobModel.find({
      status: { $regex: /^pending$/i }, // Case-insensitive regex for 'Pending'
      detailed_status: {
        $in: [
          "ETA Date Pending",
          "Estimated Time of Arrival",
          "Gateway IGM Filed",
          "Discharged",
        ],
      },
      $or: [
        { documentation_completed_date_time: { $exists: false } }, // Field does not exist
        { documentation_completed_date_time: "" }, // Field exists but is empty
      ],
    })
      .select(
        "job_no year importer type_of_b_e custom_house consignment_type gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents awb_bl_no container_nos detailed_status status"
      )
      .lean(); // Use lean() for better performance with read-only data

    if (!data || data.length === 0) {
      return res.status(200).json({ message: "No matching jobs found" });
    }

    // Custom sorting logic for `detailed_status`
    const sortedData = data.sort((a, b) => {
      const order = [
        "Discharged",
        "Gateway IGM Filed",
        "Estimated Time of Arrival",
        "ETA Date Pending",
      ];
      return (
        order.indexOf(a.detailed_status) - order.indexOf(b.detailed_status)
      );
    });

    res.status(200).json(sortedData);
  } catch (err) {
    console.error("Error fetching jobs:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

router.patch("/api/update-documentation-job/:id", async (req, res) => {
  try {
    const { id } = req.params; // Get the job ID from the URL
    const { documentation_completed_date_time } = req.body; // Take the custom date from the request body

    // Validate the provided date (if any)
    if (
      documentation_completed_date_time &&
      isNaN(Date.parse(documentation_completed_date_time))
    ) {
      return res.status(400).json({
        message: "Invalid date format. Please provide a valid ISO date string.",
      });
    }

    // Find the job by ID and update the documentation_completed_date_time field
    const updatedJob = await JobModel.findByIdAndUpdate(
      id,
      {
        $set: {
          documentation_completed_date_time:
            documentation_completed_date_time || "", // Use provided date or current date-time
        },
      },
      { new: true, lean: true } // Return the updated document
    );

    if (!updatedJob) {
      return res
        .status(404)
        .json({ message: "Job not found with the specified ID" });
    }

    res.status(200).json({
      message: "Job updated successfully",
      updatedJob,
    });
  } catch (err) {
    console.error("Error updating job:", err);

    // Return a detailed error message
    res.status(500).json({
      message: "Internal Server Error. Unable to update the job.",
      error: err.message,
    });
  }
});

export default router;

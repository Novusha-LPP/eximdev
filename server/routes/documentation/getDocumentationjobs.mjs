import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Endpoint to fetch documentation jobs with specific filters
router.get("/api/get-documentation-jobs", async (req, res) => {
  try {
    // Query to filter jobs with status 'Pending' and specific detailed_status values
    const data = await JobModel.find({
      status: "Pending",
      detailed_status: {
        $in: [
          "ETA Date Pending",
          "Estimated Time of Arrival",
          "Gateway IGM Filed",
          "Discharged",
        ],
      },
    })
      .select(
        "job_no year importer type_of_b_e custom_house consignment_type custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents detailed_status status"
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

export default router;

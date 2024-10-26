import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-free-days", async (req, res) => {
  try {
    // Extract pagination parameters from query (with default values)
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 100; // Default to 100 jobs per page
    const skip = (page - 1) * limit; // Calculate the skip value

    // Fetch all matching jobs
    const jobs = await JobModel.find(
      {
        $and: [
          { status: { $regex: /^pending$/i } }, // Case-insensitive match for 'Pending'
          {
            detailed_status: {
              $in: [
                "Discharged",
                "Gateway IGM Filed",
                "Estimated Time of Arrival",
              ],
            },
          },
        ],
      },
      "status detailed_status job_no custom_house importer shipping_line_airline awb_bl_no container_nos vessel_flight voyage_no port_of_reporting"
    );

    // Define the desired ranking order
    const rankOrder = [
      "Discharged",
      "Gateway IGM Filed",
      "Estimated Time of Arrival",
    ];

    // Group and sort jobs based on the rank order
    const groupedJobs = rankOrder.flatMap((status) =>
      jobs.filter((job) => job.detailed_status === status)
    );

    // Apply pagination to the grouped jobs
    const paginatedJobs = groupedJobs.slice(skip, skip + limit);

    // Send the paginated response along with meta information
    res.status(200).send({
      totalJobs: groupedJobs.length,
      totalPages: Math.ceil(groupedJobs.length / limit),
      currentPage: page,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

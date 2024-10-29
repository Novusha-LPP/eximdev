// Generate search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } }, // Case-insensitive search
    { custom_house: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { shipping_line_airline: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
    { "container_nos.detention_from": { $regex: search, $options: "i" } },
    { vessel_flight: { $regex: search, $options: "i" } },
    { voyage_no: { $regex: search, $options: "i" } },
    { port_of_reporting: { $regex: search, $options: "i" } },
  ],
});

import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-free-days", async (req, res) => {
  try {
    // Extract pagination and search parameters from query
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 100; // Default to 100 jobs per page
    const search = req.query.search || ""; // Search query string
    const skip = (page - 1) * limit; // Calculate the skip value

    // Build the search query
    const searchQuery = search ? buildSearchQuery(search) : {};

    // Fetch jobs based on status, detailed_status, and search query
    const jobs = await JobModel.find(
      {
        $and: [
          { status: { $regex: /^pending$/i } }, // Match 'Pending' status
          {
            detailed_status: {
              $in: [
                "Discharged",
                "Gateway IGM Filed",
                "Estimated Time of Arrival",
              ],
            },
          },
          searchQuery, // Apply the search query
        ],
      },
      "status detailed_status job_no custom_house importer shipping_line_airline awb_bl_no container_nos vessel_flight voyage_no port_of_reporting free_time"
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
// PATCH API that updates only the free_time
router.patch("/api/update-free-time/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract job ID from route parameters
    const { free_time } = req.body; // Extract free_time from request body

    // Ensure free_time is provided
    if (free_time === undefined) {
      return res.status(400).json({ error: "free_time is required" });
    }

    // Find the job by ID and update the free_time field only
    const updatedJob = await JobModel.findByIdAndUpdate(
      id,
      { free_time }, // Update only the free_time field
      { new: true, runValidators: true } // Return the updated document
    );

    // If no job is found, return a 404 response
    if (!updatedJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Return the updated job with a success message
    res.status(200).json({
      message: "Free time updated successfully",
      job: updatedJob,
    });
  } catch (error) {
    console.error("Error updating free_time:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

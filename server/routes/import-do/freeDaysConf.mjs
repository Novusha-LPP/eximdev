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
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();
router.get("/api/get-free-days",authenticateJWT, async (req, res) => {
  try {
    // Extract and validate query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const search = req.query.search || "";
    const importer = req.query.importer ? decodeURIComponent(req.query.importer).trim() : "";
    const selectedICD = req.query.selectedICD ? decodeURIComponent(req.query.selectedICD).trim() : "";
    const selectedYear = req.query.year ? req.query.year.trim() : ""; // ✅ Extract and trim year

    if (page < 1 || limit < 1) {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
            { awb_bl_no: { $regex: search, $options: "i" } },
            { shipping_line_airline: { $regex: search, $options: "i" } },
            { vessel_flight: { $regex: search, $options: "i" } },
            { voyage_no: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Define job filtering criteria
    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        {
          detailed_status: {
            $in: [
              "Discharged",
              "Gateway IGM Filed",
              "Estimated Time of Arrival",
            ],
          },
        },
        {
          $or: [
            { is_free_time_updated: { $exists: false } }, // Field doesn't exist
            { is_free_time_updated: false }, // Field exists and is false
          ],
        },
        searchQuery,
      ],
    };

    // ✅ Apply Year Filter if provided
    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear });
    }

    // ✅ Apply Importer Filter if provided
    if (importer && importer !== "Select Importer") {
      baseQuery.$and.push({ importer: { $regex: new RegExp(`^${importer}$`, "i") } });
    }

    // ✅ Apply ICD Code Filter if provided
    if (selectedICD && selectedICD !== "Select ICD") {
      baseQuery.$and.push({ custom_house: { $regex: new RegExp(`^${selectedICD}$`, "i") } });
    }

    // Fetch jobs based on the query
    const jobs = await JobModel.find(baseQuery)
      .select(
        "status detailed_status job_no custom_house importer shipping_line_airline awb_bl_no container_nos vessel_flight voyage_no port_of_reporting free_time type_of_b_e consignment_type year, cth_documents checklist processed_be_attachment line_no"
      )
      .lean();

    // Define sorting order based on `detailed_status`
    const rankOrder = [
      "Discharged",
      "Gateway IGM Filed",
      "Estimated Time of Arrival",
    ];

    // Sort jobs according to predefined `detailed_status` order
    const sortedJobs = rankOrder.flatMap((status) =>
      jobs.filter((job) => job.detailed_status === status)
    );

    // Apply pagination
    const totalJobs = sortedJobs.length;
    const paginatedJobs = sortedJobs.slice(skip, skip + limit);

    // ✅ If no jobs are found (even with an importer or ICD filter), return an empty list instead of an error
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error fetching free days jobs:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
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
      { free_time, is_free_time_updated: true }, // Update only the free_time field
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

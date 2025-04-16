import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

// Function to build the search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { type_of_b_e: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { consignment_type: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
    { "container_nos.size": { $regex: search, $options: "i" } },
  ],
});

router.get("/api/get-documentation-jobs",authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", importer, year } = req.query;

    // Parse and validate query parameters
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = search ? buildSearchQuery(search) : {};

    // Decode importer (handle spaces and special characters)
    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";

    // Define the order for grouping by `detailed_status`
    const statusOrder = [
      "Discharged",
      "Gateway IGM Filed",
      "Estimated Time of Arrival",
      "ETA Date Pending",
    ];

    // Build the base query
    // Build the base query
    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        { be_no: { $in: [null, ""] } }, // Exclude "cancelled"
        { job_no: { $ne: null } }, // Ensure job_no is not null
        { out_of_charge: { $eq: "" } }, // Exclude jobs with any value in `out_of_charge`
        {
          detailed_status: {
            $in: statusOrder,
          },
        },
        {
          $or: [
            { documentation_completed_date_time: { $exists: false } },
            { documentation_completed_date_time: "" },
          ],
        },
        searchQuery,
      ],
    };

    // ✅ Add Year Filter if provided
    // ✅ Ensure year is correctly formatted before applying the filter
    if (year && year !== "Select Year") {
      baseQuery.$and.push({ year: { $regex: new RegExp(`^${year}$`, "i") } });
      // Uses regex for partial match (if year is stored as a string like "24-25")
    }

    // ✅ Apply Importer Filter (similar to E-Sanchit API)
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    // Fetch jobs from the database
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob job_no year importer type_of_b_e custom_house consignment_type gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents awb_bl_no awb_bl_date container_nos detailed_status status checklist"
      )
      .lean();

    // Define priority-based ranking logic
    const priorityRank = (job) => {
      if (job.priorityJob === "High Priority") return 1;
      if (job.priorityJob === "Priority") return 2;
      if (job.detailed_status === "Discharged") return 3;
      if (job.detailed_status === "Gateway IGM Filed") return 4;
      return 5; // Default rank for jobs without a priority
    };

    // Sort jobs by priority first, then by custom status order
    const sortedJobs = allJobs.sort((a, b) => {
      const priorityDifference = priorityRank(a) - priorityRank(b);
      if (priorityDifference !== 0) {
        return priorityDifference; // Sort by priority if different
      }
      // If priorities are the same, sort by `detailed_status`
      return (
        statusOrder.indexOf(a.detailed_status) -
        statusOrder.indexOf(b.detailed_status)
      );
    });

    // Apply pagination after sorting
    const totalJobs = sortedJobs.length;
    const paginatedJobs = sortedJobs.slice(skip, skip + limitNumber);

    // If no jobs found, return 404 (similar to E-Sanchit)
    // If no jobs found, return an empty response instead of 404
    if (!paginatedJobs || paginatedJobs.length === 0) {
      return res.status(200).json({
        totalJobs: 0,
        totalPages: 1,
        currentPage: pageNumber,
        jobs: [], // ✅ Return an empty array instead of 404
        message: "No data found for the selected filters",
      });
    }

    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (err) {
    console.error("Error fetching documentation jobs:", err.stack);
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
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

import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Function to build the search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { year: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { consignment_type: { $regex: search, $options: "i" } },
    { type_of_b_e: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
    // Add more fields as needed for search
  ],
});

router.get("/api/get-esanchit-jobs", async (req, res) => {
  // Extract query parameters with default values
  const { page = 1, limit = 100, search = "" } = req.query;

  // Validate query parameters
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ message: "Invalid page number" });
  }
  if (isNaN(limitNumber) || limitNumber < 1) {
    return res.status(400).json({ message: "Invalid limit value" });
  }

  try {
    // Calculate the number of documents to skip for pagination
    const skip = (pageNumber - 1) * limitNumber;

    // Build the search query if a search term is provided
    const searchQuery = search ? buildSearchQuery(search) : {};

    // Construct the base query
    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        { job_no: { $ne: null } },
        { out_of_charge: { $eq: "" } }, // Exclude jobs with any value in `out_of_charge`
        {
          $or: [
            { esanchit_completed_date_time: { $exists: false } },
            { esanchit_completed_date_time: "" },
            { esanchit_completed_date_time: null },
            { "cth_documents.document_check_date": "" },
          ],
        },
        searchQuery,
      ],
    };

    // First, fetch ALL matching documents (so we can custom-sort them):
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob detailed_status esanchit_completed_date_time status out_of_charge be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no container_nos out_of_charge"
      )
      .sort({ gateway_igm_date: 1 });
    // You can keep this initial sort if you want gateway_igm_date ascending within ties.

    // Now do a custom in-memory sort based on priority/detailed_status
    // in the exact order you mentioned:
    // 1) High Priority
    // 2) Priority
    // 3) Discharged
    // 4) Gateway IGM Filed
    // 5) The rest
    const rankedJobs = allJobs.sort((a, b) => {
      const rank = (job) => {
        if (job.priorityJob === "High Priority") return 1;
        if (job.priorityJob === "Priority") return 2;
        if (job.detailed_status === "Discharged") return 3;
        if (job.detailed_status === "Gateway IGM Filed") return 4;
        // anything else
        return 5;
      };
      return rank(a) - rank(b);
    });

    // Now apply pagination on the sorted array
    const totalJobs = rankedJobs.length; // total number of matched documents
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    // If no jobs found in this paginated slice, return 404
    if (!paginatedJobs || paginatedJobs.length === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    // Send the response with pagination and job data
    return res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    return res.status(500).json({ message: "Internal server error" });
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
      job.esanchit_completed_date_time = esanchit_completed_date_time || ""; // Set to null if cleared
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

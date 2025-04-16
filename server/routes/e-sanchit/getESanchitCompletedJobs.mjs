import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

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

router.get("/api/get-esanchit-completed-jobs",authenticateJWT, async (req, res) => {
  // Extract and decode query parameters
  const { page = 1, limit = 100, search = "", importer, year } = req.query;

  // Decode `importer` (in case it's URL encoded as `%20` for spaces)
  const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";

  // Validate query parameters
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const selectedYear = year ? year.toString() : null; // ✅ Ensure it’s a string

  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ message: "Invalid page number" });
  }
  if (isNaN(limitNumber) || limitNumber < 1) {
    return res.status(400).json({ message: "Invalid limit value" });
  }

  try {
    // Calculate pagination skip value
    const skip = (pageNumber - 1) * limitNumber;

    // Build search query if provided
    const searchQuery = search ? buildSearchQuery(search) : {};

    // Construct base query
   const baseQuery = {
     $and: [
       { status: { $regex: /^pending$/i } }, // ✅ Status must be "pending"
       { be_no: { $in: [null, ""] } },  // ✅ Exclude documents with `be_no` as "cancelled"
       { job_no: { $ne: null } }, // ✅ Ensure `job_no` is not null
       {
         out_of_charge: { $in: [null, ""] }, // ✅ Exclude if `out_of_charge_date` has any value
       },
       {
         esanchit_completed_date_time: { $exists: true, $ne: "" }, // ✅ `esanchit_completed_date_time` must exist and not be empty
       },
       searchQuery, // ✅ Apply search filters
     ],
   };


    // ✅ Apply Year Filter if Provided
    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear });
    }

    // ✅ Apply Importer Filter (ensure spaces are handled correctly)
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    // Fetch and sort jobs
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob detailed_status esanchit_completed_date_time status out_of_charge be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no container_nos out_of_charge irn"
      )
      .sort({ gateway_igm_date: 1 });

    // Custom sorting
    const rankedJobs = allJobs.sort((a, b) => {
      const rank = (job) => {
        if (job.priorityJob === "High Priority") return 1;
        if (job.priorityJob === "Priority") return 2;
        if (job.detailed_status === "Discharged") return 3;
        if (job.detailed_status === "Gateway IGM Filed") return 4;
        return 5;
      };
      return rank(a) - rank(b);
    });

    // Pagination
    const totalJobs = rankedJobs.length;
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    // Handle case where no jobs match the query
    if (!paginatedJobs || paginatedJobs.length === 0) {
      return res.status(200).json({
        totalJobs: 0,
        totalPages: 1,
        currentPage: pageNumber,
        jobs: [], // Return an empty array instead of 404
      });
    }
    // Send response
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
// router.patch("/api/update-esanchit-job/:job_no/:year", async (req, res) => {
//   const { job_no, year } = req.params;
//   const { cth_documents, queries, esanchit_completed_date_time } = req.body;

//   try {
//     // Find the job by job_no and year
//     const job = await JobModel.findOne({ job_no, year });

//     if (!job) {
//       return res.status(404).json({ message: "Job not found" });
//     }

//     // Update fields only if provided
//     if (cth_documents) {
//       job.cth_documents = cth_documents;
//     }

//     if (queries) {
//       job.eSachitQueries = queries;
//     }

//     // Update esanchit_completed_date_time only if it exists in the request
//     if (esanchit_completed_date_time !== undefined) {
//       job.esanchit_completed_date_time = esanchit_completed_date_time || ""; // Set to null if cleared
//     }

//     // Save the updated job
//     await job.save();

//     res.status(200).json({ message: "Job updated successfully", job });
//   } catch (err) {
//     console.error("Error updating job:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

export default router;

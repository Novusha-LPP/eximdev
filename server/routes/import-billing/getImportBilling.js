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
    // Add more fields as needed for search!
  ],
});


router.get("/api/get-billing-import-job", async (req, res) => {
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
    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        {
          bill_document_sent_to_accounts: {
            $exists: true,
            $nin: [null, ""],
          },
        },
        {
          $or: [
            { billing_completed_date: { $exists: false } },
            { billing_completed_date: "" },
            { billing_completed_date: null },
          ],
        },
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
        "priorityJob detailed_status esanchit_completed_date_time status out_of_charge be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy"
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
// router.patch("/api/view-billing-job/:id", async (req, res) => {
//   try {
//     const { id } = req.params; // Get the job ID from the URL
//     const { billing_completed_date } = req.body; // Take the custom date from the request body

//     // Validate the provided date (if any)
//     if (
//       billing_completed_date &&
//       isNaN(Date.parse(billing_completed_date))
//     ) {
//       return res.status(400).json({
//         message: "Invalid date format. Please provide a valid ISO date string.",
//       });
//     }

//     // Find the job by ID and update the billing_completed_date field
//     const updatedJob = await JobModel.findByIdAndUpdate(
//       id,
//       {
//         $set: {
//           billing_completed_date:
//           billing_completed_date || "", // Use provided date or current date-time
//         },
//       },
//       { new: true, lean: true } // Return the updated document
//     );

//     if (!updatedJob) {
//       return res
//         .status(404)
//         .json({ message: "Job not found with the specified ID" });
//     }

//     res.status(200).json({
//       message: "Job updated successfully",
//       updatedJob,
//     });
//   } catch (err) {
//     console.error("Error updating job:", err);

//     // Return a detailed error message
//     res.status(500).json({
//       message: "Internal Server Error. Unable to update the job.",
//       error: err.message,
//     });
//   }
// });

export default router;

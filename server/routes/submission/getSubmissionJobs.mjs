import express from "express";
import JobModel from "../../model/jobModel.mjs";

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
  ],
});

router.get("/api/get-submission-jobs", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    // Validate query parameters
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

    // Construct the base query
    const baseQuery = {
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
        searchQuery, // Apply search filters
      ],
    };

    // Fetch total count for pagination metadata
    const totalJobs = await JobModel.countDocuments(baseQuery);

    // Fetch paginated data
    const jobs = await JobModel.find(baseQuery)
      .select(
        "job_no year type_of_b_e consignment_type custom_house gateway_igm_date gateway_igm igm_no igm_date invoice_number invoice_date awb_bl_no awb_bl_date importer container_nos cth_documents"
      )
      .skip(skip)
      .limit(limitNumber)
      .lean();

    res.status(200).json({
      totalJobs, // Total number of jobs matching the query
      totalPages: Math.ceil(totalJobs / limitNumber), // Total pages based on limit
      currentPage: pageNumber, // Current page
      jobs, // Array of jobs for the current page
    });
  } catch (error) {
    console.error("Error fetching submission jobs:", error.stack);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

export default router;

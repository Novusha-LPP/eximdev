import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Utility function to build search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { shipping_line_airline: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { vessel_flight: { $regex: search, $options: "i" } },
    { voyage_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
  ],
});

router.get("/api/get-do-module-jobs", async (req, res) => {
  try {
    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    // Step 1: Initial query to get jobs based on primary conditions
    const primaryConditions = [
      { status: { $regex: /^pending$/i } },
      {
        $or: [
          {
            $and: [
              {
                $or: [
                  { do_completed: true },
                  { do_completed: "Yes" },
                  { do_completed: { $exists: true } },
                ],
              },
              {
                "container_nos.do_revalidation": {
                  $elemMatch: {
                    do_revalidation_upto: { $type: "string", $ne: "" },
                    do_Revalidation_Completed: false,
                  },
                },
              },
            ],
          },
          {
            $and: [
              { $or: [{ doPlanning: true }, { doPlanning: "true" }] },
              {
                $or: [
                  { do_completed: false },
                  { do_completed: "No" },
                  { do_completed: { $exists: false } },
                  { do_completed: "" },
                  { do_completed: null },
                ],
              },
            ],
          },
        ],
      },
    ];

    // Add search query if search term is provided
    if (search) {
      primaryConditions.push(buildSearchQuery(search));
    }

    const initialJobs = await JobModel.find(
      { $and: primaryConditions },
      "job_no year importer awb_bl_no shipping_line_airline custom_house obl_telex_bl payment_made importer_address voyage_no be_no vessel_flight do_validity_upto_job_level container_nos do_Revalidation_Completed doPlanning do_completed type_of_Do"
    );

    // const initialJobs = await JobModel.find({ status: "pending" }).limit(10);

    // Step 2: Filter out jobs where all `do_Revalidation_Completed` are true in `container_nos.do_revalidation`
    const filteredJobs = initialJobs.filter(
      (job) =>
        job.container_nos &&
        Array.isArray(job.container_nos) &&
        !job.container_nos.every(
          (container) =>
            Array.isArray(container.do_revalidation) &&
            container.do_revalidation.every(
              (revalidation) => revalidation.do_Revalidation_Completed === true
            )
        )
    );

    // Combine results and eliminate duplicates
    const allJobs = [...new Set([...initialJobs, ...filteredJobs])];

    // Add displayDate and dayDifference to each job
    const jobsWithCalculatedFields = allJobs.map((job) => {
      // Check if do_validity_upto_job_level exists and is a valid date
      const jobLevelDate = job.do_validity_upto_job_level
        ? new Date(job.do_validity_upto_job_level)
        : null;

      const containerLevelDate = job.container_nos?.[0]
        ?.required_do_validity_upto
        ? new Date(job.container_nos[0].required_do_validity_upto)
        : null;

      // Determine if the dates are valid
      const isJobLevelDateValid =
        jobLevelDate instanceof Date && !isNaN(jobLevelDate);
      const isContainerLevelDateValid =
        containerLevelDate instanceof Date && !isNaN(containerLevelDate);

      // Determine displayDate and calculate dayDifference only if dates are valid
      const isContainerDateHigher =
        isContainerLevelDateValid && containerLevelDate > jobLevelDate;

      const displayDate = isContainerDateHigher
        ? containerLevelDate.toISOString().split("T")[0]
        : isJobLevelDateValid
        ? jobLevelDate.toISOString().split("T")[0]
        : ""; // Fallback to empty string if invalid

      const dayDifference = isContainerDateHigher
        ? Math.ceil((containerLevelDate - jobLevelDate) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...job.toObject(), // Keep all original job fields
        displayDate, // Add calculated displayDate
        dayDifference, // Add calculated dayDifference
      };
    });

    // Sort jobs:
    //  1. Positive dayDifference jobs first, descending by dayDifference.
    // 2. Non-positive dayDifference jobs next, ascending by displayDate.
    jobsWithCalculatedFields.sort((a, b) => {
      if (a.dayDifference > 0 && b.dayDifference <= 0) return -1;
      if (a.dayDifference <= 0 && b.dayDifference > 0) return 1;
      if (a.dayDifference > 0 && b.dayDifference > 0) {
        return b.dayDifference - a.dayDifference; // Ascending by dayDifference for positive values
      }
      return new Date(a.displayDate) - new Date(b.displayDate); // Ascending by displayDate for non-positive values
    });

    // Apply pagination
    const paginatedJobs = jobsWithCalculatedFields.slice(skip, skip + limit);

    // Send paginated response
    res.status(200).send({
      totalJobs: jobsWithCalculatedFields.length,
      totalPages: Math.ceil(jobsWithCalculatedFields.length / limit),
      currentPage: page,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error in /api/get-do-module-jobs:", error.stack || error);
    res.status(500).send({
      error: "Internal Server Error",
      message: error.message,
      stack: error.stack, // Add stack trace for more context
    });
  }
});

export default router;

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
              { $or: [{ do_completed: true }, { do_completed: "Yes" }] },
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
      "job_no year importer awb_bl_no shipping_line_airline custom_house obl_telex_bl payment_made importer_address voyage_no be_no vessel_flight do_validity_upto_job_level container_nos do_Revalidation_Completed doPlanning do_completed"
    );

    // Step 2: Filter out jobs where all `do_Revalidation_Completed` are true in `container_nos.do_revalidation`
    const filteredJobs = initialJobs.filter(
      (job) =>
        !job.container_nos?.every((container) =>
          container.do_revalidation?.every(
            (revalidation) => revalidation.do_Revalidation_Completed === true
          )
        )
    );

    // Combine results and eliminate duplicates
    const allJobs = [...new Set([...initialJobs, ...filteredJobs])];

    // Apply pagination
    const paginatedJobs = allJobs.slice(skip, skip + limit);

    // Send paginated response
    res.status(200).send({
      totalJobs: allJobs.length,
      totalPages: Math.ceil(allJobs.length / limit),
      currentPage: page,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

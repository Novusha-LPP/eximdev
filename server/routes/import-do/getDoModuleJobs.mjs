import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-do-module-jobs", async (req, res) => {
  try {
    // Step 1: Initial query to get jobs based on primary conditions
    const initialJobs = await JobModel.find(
      {
        $and: [
          // Status must be "pending" (case-insensitive)
          { status: { $regex: /^pending$/i } },
          {
            $or: [
              // Case 1: Include if `do_completed` is "Yes" or true, and then check if `do_revalidation_upto` has a non-empty string
              // and `do_Revalidation_Completed` is false within `container_nos.do_revalidation`
              {
                $and: [
                  {
                    $or: [{ do_completed: true }, { do_completed: "Yes" }],
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
              // Case 2: Include if `doPlanning` is true and `do_completed` is either false, "No", or does not exist
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
        ],
      },
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

    // Union of Step 1 and Step 2 results
    const allJobs = [...new Set([...initialJobs, ...filteredJobs])];

    // Send the unioned results
    res.status(200).send(allJobs);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

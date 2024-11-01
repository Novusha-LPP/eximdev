import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-do-module-jobs", async (req, res) => {
  try {
    const jobs = await JobModel.find(
      {
        $and: [
          // Status must be "pending" (case-insensitive)
          { status: { $regex: /^pending$/i } },
          {
            $or: [
              // Case 1: doPlanning is true and do_completed is "No"
              {
                $and: [
                  { $or: [{ doPlanning: true }, { doPlanning: "true" }] },
                  {
                    // Exclude jobs with do_completed: "Yes" or true
                    $nor: [
                      { do_completed: { $regex: /^yes$/i } },
                      { do_completed: true },
                    ],
                  },
                ],
              },
              // Case 2: doPlanning is true, do_revalidation_date exists, and do_completed is not "Yes"/true
              {
                $and: [
                  { $or: [{ doPlanning: true }, { doPlanning: "true" }] },
                  {
                    // Exclude jobs with do_completed: "Yes" or true
                    $or: [
                      { do_completed: { $regex: /^yes$/i } },
                      { do_completed: true },
                    ],
                  },
                  { do_revalidation_date: { $exists: true, $ne: null } },
                ],
              },
            ],
          },
        ],
      },
      "job_no year importer awb_bl_no shipping_line_airline custom_house obl_telex_bl payment_made importer_address voyage_no be_no vessel_flight do_validity_upto_job_level container_nos"
    );

    res.status(200).send(jobs);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

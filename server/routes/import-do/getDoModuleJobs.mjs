import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-do-module-jobs", async (req, res) => {
  try {
    const jobs = await JobModel.find(
      {
        $and: [
          {
            $or: [{ do_documents: { $exists: false } }, { do_documents: [] }],
          },
          { $or: [{ doPlanning: true }, { doPlanning: "true" }] },
          {
            $or: [{ do_completed: "No" }, { do_completed: { $exists: false } }],
          },
        ],
      },
      "job_no year importer awb_bl_no shipping_line_airline custom_house obl_telex_bl payment_made importer_address voyage_no be_no vessel_flight"
    );

    res.status(200).send(jobs);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

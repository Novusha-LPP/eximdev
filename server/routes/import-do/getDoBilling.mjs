import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-do-billing", async (req, res) => {
  try {
    const jobs = await JobModel.find(
      {
        do_completed: "Yes",
      },
      "job_no importer awb_bl_no shipping_line_airline custom_house obl_telex_bl bill_document_sent_to_accounts"
    );

    res.status(200).send(jobs);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

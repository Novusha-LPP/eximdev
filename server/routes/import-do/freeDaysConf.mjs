import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-free-days", async (req, res) => {
  try {
    const jobs = await JobModel.find(
      {
        status: { $regex: /^pending$/i }, // Case-insensitive regex search
      },
      "job_no importer awb_bl_no shipping_line_airline custom_house obl_telex_bl bill_document_sent_to_accounts port_of_reporting container_nos vessel_flight voyage_no"
    );

    res.status(200).send(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

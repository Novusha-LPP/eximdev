import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-submission-jobs", async (req, res) => {
  try {
    const data = await JobModel.find({
      $or: [{ be_no: { $exists: false } }, { be_no: "" }],
      document_entry_completed: true,
    }).select(
      "job_no year importer custom_house gateway_igm_date discharge_date checklist_verified_on submission_date submission_queries cth_documents documents"
    ); // Include only job_no and year in the results

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

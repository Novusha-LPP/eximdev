import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-esanchit-jobs", async (req, res) => {
  try {
    const data = await JobModel.find({
      $or: [{ be_no: { $exists: false } }, { be_no: "" }],
    }).select(
      "job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents"
    );
    if (!data) {
      return res.status(200).json({ message: "Data not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.log(err);
  }
});

export default router;

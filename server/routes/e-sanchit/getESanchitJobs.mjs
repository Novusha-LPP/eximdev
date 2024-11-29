import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-esanchit-jobs", async (req, res) => {
  try {
    const data = await JobModel.find({
      $and: [
        {
          status: { $regex: /^pending$/i },
          job_no: { $ne: null },
        },
      ],
    }).select(
      "job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents consignment_type type_of_b_e awb_bl_date awb_bl_no container_nos"
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

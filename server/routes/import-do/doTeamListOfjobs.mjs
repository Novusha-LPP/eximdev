import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/do-team-list-of-jobs", async (req, res) => {
  const jobs = await JobModel.find(
    {
      $or: [{ be_no: { $exists: true } }, { be_no: { $ne: "" } }],
      $and: [
        {
          $or: [
            { shipping_line_bond_completed_date: { $exists: false } },
            { shipping_line_bond_completed_date: "" },
          ],
        },
        {
          $or: [
            { shipping_line_kyc_completed_date: { $exists: false } },
            { shipping_line_kyc_completed_date: "" },
          ],
        },
        {
          $or: [
            { shipping_line_invoice_received_date: { $exists: false } },
            { shipping_line_invoice_received_date: "" },
          ],
        },
        {
          $or: [{ bill_date: { $exists: false } }, { bill_date: "" }],
        },
      ],
    },
    "job_no year awb_bl_no shipping_line_airline custom_house obl_telex_bl importer importer_address vessel_flight voyage_no"
  );

  res.status(200).send(jobs);
});

export default router;

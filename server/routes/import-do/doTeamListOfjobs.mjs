import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/do-team-list-of-jobs", async (req, res) => {
  const { page = 1, limit = 100, search = "" } = req.query;
  const skip = (page - 1) * limit;

  try {
    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
            { awb_bl_no: { $regex: search, $options: "i" } },
            { shipping_line_airline: { $regex: search, $options: "i" } },
            { vessel_flight: { $regex: search, $options: "i" } },
            { voyage_no: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Apply conditions and search query
    const conditions = {
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
      ...searchQuery,
    };

    // Fetch paginated jobs
    const jobs = await JobModel.find(
      conditions,
      "job_no year awb_bl_no shipping_line_airline custom_house obl_telex_bl importer importer_address vessel_flight voyage_no container_nos"
    )
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await JobModel.countDocuments(conditions);
    const totalPages = Math.ceil(totalJobs / limit);

    res.status(200).send({
      jobs,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

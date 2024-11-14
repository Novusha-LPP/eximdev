import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Utility function to build search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { shipping_line_airline: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { vessel_flight: { $regex: search, $options: "i" } },
    { voyage_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
  ],
});

router.get("/api/get-do-billing", async (req, res) => {
  try {
    // Search and Pagination
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Primary conditions
    const primaryConditions = [
      { status: { $regex: /^pending$/i } },
      { delivery_date: { $exists: true, $ne: "" } },
    ];

    // Add search conditions if search term is provided
    if (search) {
      primaryConditions.push(buildSearchQuery(search));
    }

    // Query to find jobs matching the combined conditions
    const jobs = await JobModel.find(
      { $and: primaryConditions },
      "job_no importer awb_bl_no shipping_line_airline custom_house obl_telex_bl bill_document_sent_to_accounts delivery_date status"
    )
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalJobs = await JobModel.countDocuments({
      $and: primaryConditions,
    });

    // Send paginated response
    res.status(200).send({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
      jobs,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

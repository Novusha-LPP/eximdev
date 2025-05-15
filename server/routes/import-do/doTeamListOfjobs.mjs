import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/do-team-list-of-jobs",authenticateJWT, async (req, res) => {
  try {
    // Extract and validate query parameters
    const { page = 1, limit = 100, search = "", importer, selectedICD, year } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const selectedYear = year ? year.trim() : ""; // ✅ Keep year as a string
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const skip = (pageNumber - 1) * limitNumber;

    // Decode and trim query params
    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";
    const decodedICD = selectedICD ? decodeURIComponent(selectedICD).trim() : "";

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

    // Base query conditions (without importer or ICD filter)
const baseQuery = {
  $and: [
    { job_no: { $ne: null } },
    { be_no: { $exists: true, $ne: "" } },
    {
      be_no: {
        $not: {
          $regex: "^cancelled$",
          $options: "i", // Case-insensitive
        },
      },
    },
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
    {
      $or: [
        { do_planning_date: { $exists: false } }, // Does not exist
        { do_planning_date: "" }, // Is an empty string
        { do_planning_date: null }, // Is explicitly null
      ],
    },
    searchQuery,
  ],
};



     // ✅ Apply Year Filter if Provided
     if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear }); // Match year as a string
    }

    // ✅ If importer is selected, add it to the query
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({ importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") } });
    }

    // ✅ If selectedICD is provided, filter by ICD Code
    if (decodedICD && decodedICD !== "Select ICD") {
      baseQuery.$and.push({ custom_house: { $regex: new RegExp(`^${decodedICD}$`, "i") } });
    }

    // 🔍 **Step 1: Fetch Jobs After Applying Filters**
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "job_no year awb_bl_no shipping_line_airline custom_house obl_telex_bl importer importer_address vessel_flight voyage_no container_nos type_of_b_e consignment_type igm_no igm_date gateway_igm_date gateway_igm be_no be_date cth_documents checklist processed_be_attachment line_no"
      )
      .lean();

    // Step 2: Sorting logic
    const priorityRank = (job) => {
      if (job.priorityJob === "High Priority") return 1;
      if (job.priorityJob === "Priority") return 2;
      return 3;
    };
    const sortedJobs = allJobs.sort((a, b) => priorityRank(a) - priorityRank(b));

    // Apply pagination
    const totalJobs = sortedJobs.length;
    const paginatedJobs = sortedJobs.slice(skip, skip + limitNumber);

    // ✅ If no jobs found, return an empty list
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error fetching DO team jobs:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

export default router;

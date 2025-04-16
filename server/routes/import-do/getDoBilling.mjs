import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

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

router.get("/api/get-do-billing",authenticateJWT, async (req, res) => {
  try {
    // Extract and validate query parameters
    const {
      page = 1,
      limit = 100,
      search = "",
      importer,
      selectedICD,
      obl_telex_bl,
      year,
    } = req.query;

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

    // Decode and trim query parameters
    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";
    const decodedICD = selectedICD
      ? decodeURIComponent(selectedICD).trim()
      : "";
    
    const decodedOBL = obl_telex_bl
      ? decodeURIComponent(obl_telex_bl).trim()
      : "";

    // **Step 1: Define query conditions**
    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        {
          $or: [
            { bill_document_sent_to_accounts: { $exists: false } },
            { bill_document_sent_to_accounts: "" },
          ],
        }, // Exclude jobs where bill_document_sent_to_accounts is set
        { detailed_status: { $regex: /^Billing Pending$/i } }, // New condition for detail_status
      ],
    };

    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear });
    }

    // ✅ Apply search filter if provided
    if (search) {
      baseQuery.$and.push(buildSearchQuery(search));
    }

    // ✅ If importer is selected, filter by importer
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    // ✅ If selectedICD is provided, filter by ICD Code
    if (decodedICD && decodedICD !== "Select ICD") {
      baseQuery.$and.push({
        custom_house: { $regex: new RegExp(`^${decodedICD}$`, "i") },
      });
    }
    if (decodedOBL && decodedOBL !== "Select OBL") {
      baseQuery.$and.push({
        obl_telex_bl: { $regex: new RegExp(`^${decodedOBL}$`, "i") },
      });
    }

    // **Step 2: Fetch jobs after applying filters**
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "job_no importer awb_bl_no shipping_line_airline custom_house obl_telex_bl bill_document_sent_to_accounts delivery_date status bill_date type_of_b_e consignment_type ooc_copies concor_invoice_and_receipt_copy shipping_line_invoice_imgs"
      )
      .lean();

    // **Step 3: Apply Pagination**
    const totalJobs = allJobs.length;
    const paginatedJobs = allJobs.slice(skip, skip + limitNumber);

    // ✅ Return paginated response
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (error) {
    console.error("Error in /api/get-do-billing:", error.stack || error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

export default router;

import express from "express";
import JobModel from "../../model/jobModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";
import { applyUserBranchFilter } from "../../middleware/branchMiddleware.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

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

router.get(
  "/api/get-all-do-jobs",
  applyUserIcdFilter,
  applyUserBranchFilter,
  async (req, res) => {
    try {
      // Extract and validate query parameters
      const {
        page = 1,
        limit = 100,
        search = "",
        importer,
        selectedICD,
        year,
        unresolvedOnly,
        branchId,
        category,
      } = req.query;

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const selectedYear = year ? year.trim() : "";

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

      // **Step 1: Define query conditions**
      // Fetch both Pending and Completed status jobs
      const baseQuery = {
        $and: [
          { job_no: { $ne: null } },
          {
            status: {
              $regex: /^(pending|completed)$/i,
            },
          },
          {
            be_no: {
              $not: {
                $regex: "^cancelled$",
                $options: "i",
              },
            },
          },
        ],
      };

      // ✅ Apply unresolved queries filter if requested
      if (unresolvedOnly === "true") {
        baseQuery.$and.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      if (selectedYear) {
        baseQuery.$and.push({ year: selectedYear });
      }

      // ✅ Apply search filter if provided
      if (search) {
        baseQuery.$and.push(buildSearchQuery(search));
      }

      // ✅ Apply importer filter if provided
      if (decodedImporter && decodedImporter !== "Select Importer" && decodedImporter !== "All Importers") {
        baseQuery.$and.push({
          importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
        });
      }

      // ✅ Apply branch filter
      const branchMatch = getBranchMatch(
        branchId,
        category,
        req.authorizedBranchIds
      );
      baseQuery.$and.push(branchMatch);

      // ✅ Apply ICD filter if provided
      if (decodedICD && decodedICD !== "All ICDs" && decodedICD !== "Select ICD") {
        baseQuery.$and.push({
          custom_house: { $regex: new RegExp(`^${decodedICD}$`, "i") },
        });
      }

      // ✅ Apply user-based ICD filter from middleware
      if (req.userIcdFilter) {
        baseQuery.$and.push(req.userIcdFilter);
      }

      // **Step 2: Fetch count of documents**
      const totalJobs = await JobModel.countDocuments(baseQuery);

      // **Step 3: Fetch jobs after applying filters**
      const jobs = await JobModel.find(baseQuery)
        .select(
          "job_number job_no port_of_reporting year importer is_do_doc_recieved do_shipping_line_invoice awb_bl_no shipping_line_airline custom_house obl_telex_bl payment_made importer_address voyage_no be_no vessel_flight do_validity_upto_job_level container_nos do_Revalidation_Completed doPlanning documents cth_documents all_documents do_completed type_of_Do type_of_b_e consignment_type icd_code igm_no igm_date gateway_igm_date gateway_igm checklist be_date processed_be_attachment line_no do_validity do_copies do_list ooc_copies in_bond_ooc_copies free_time mode branch_code trade_type status detailed_status row_color"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

      // **Step 4: Calculate unresolvedCount**
      const unresolvedQueryBase = { ...baseQuery };
      unresolvedQueryBase.$and = unresolvedQueryBase.$and.filter(
        (condition) => !condition.hasOwnProperty("dsr_queries")
      );
      unresolvedQueryBase.$and.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
      });
      const unresolvedCount = await JobModel.countDocuments(unresolvedQueryBase);

      // ✅ Return paginated response
      res.status(200).json({
        totalJobs,
        totalPages: Math.ceil(totalJobs / limitNumber),
        currentPage: pageNumber,
        jobs,
        unresolvedCount,
      });
    } catch (error) {
      console.error("Error in /api/get-all-do-jobs:", error.stack || error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
);

export default router;

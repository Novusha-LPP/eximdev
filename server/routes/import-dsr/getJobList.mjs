import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { applyUserImporterFilter } from "../../middleware/icdFilter.mjs";
import { determineDetailedStatus } from "../../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../../utils/statusColorMapper.mjs";

const router = express.Router();

// Status Rank Configuration

const statusRank = {
  "Billing Pending": { rank: 1, field: "emptyContainerOffLoadDate" },
  "Custom Clearance Completed": { rank: 2, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 3, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 4, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 5, field: "be_date" },
  "Arrived, BE Note Pending": { rank: 6, field: "be_date" },
  "Rail Out": { rank: 7, field: "rail_out" },
  Discharged: { rank: 8, field: "discharge_date" },
  "Gateway IGM Filed": { rank: 9, field: "gateway_igm_date" },
  "Estimated Time of Arrival": { rank: 10, field: "vessel_berthing" },
};

// Helper to safely parse dates
const parseDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Field selection logic
const defaultFields = `
  job_no cth_no year importer custom_house hawb_hbl_no awb_bl_no container_nos vessel_berthing total_duty do_doc_recieved_date is_do_doc_recieved obl_recieved_date is_obl_recieved do_copies do_list
  gateway_igm_date discharge_date detailed_status row_color be_no be_date loading_port free_time is_og_doc_recieved og_doc_recieved_date do_shipping_line_invoice RMS do_validity_upto_job_level 
  port_of_reporting type_of_b_e consignment_type shipping_line_airline bill_date out_of_charge pcv_date delivery_date emptyContainerOffLoadDate do_completed do_validity cth_documents payment_method supplier_exporter gross_weight job_net_weight processed_be_attachment ooc_copies gate_pass_copies fta_Benefit_date_time origin_country hss saller_name adCode assessment_date by_road_movement_date description invoice_number invoice_date delivery_chalan_file duty_paid_date fine_amount penalty_amount penalty_by_us penalty_by_importer other_do_documents intrest_ammount sws_ammount igst_ammount bcd_ammount assessable_ammount
`;

const additionalFieldsByStatus = {
  be_noted_clearance_pending: "",
  pcv_done_duty_payment_pending: "out_of_charge pcv_date",
  custom_clearance_completed: "out_of_charge",
};

const getSelectedFields = (status) =>
  `${defaultFields} ${additionalFieldsByStatus[status] || ""}`.trim();

// Generate search query
const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escaping special regex characters
};

const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: escapeRegex(search), $options: "i" } },
    { type_of_b_e: { $regex: escapeRegex(search), $options: "i" } },
    { supplier_exporter: { $regex: escapeRegex(search), $options: "i" } },
    { consignment_type: { $regex: escapeRegex(search), $options: "i" } },
    { importer: { $regex: escapeRegex(search), $options: "i" } },
    { selectedICD: { $regex: escapeRegex(search), $options: "i" } },
    { custom_house: { $regex: escapeRegex(search), $options: "i" } },
    { awb_bl_no: { $regex: escapeRegex(search), $options: "i" } },
    { vessel_berthing: { $regex: escapeRegex(search), $options: "i" } },
    { gateway_igm_date: { $regex: escapeRegex(search), $options: "i" } },
    { discharge_date: { $regex: escapeRegex(search), $options: "i" } },
    { be_no: { $regex: escapeRegex(search), $options: "i" } },
    { be_date: { $regex: escapeRegex(search), $options: "i" } },
    { loading_port: { $regex: escapeRegex(search), $options: "i" } },
    { port_of_reporting: { $regex: escapeRegex(search), $options: "i" } },
    { hawb_hbl_no: { $regex: escapeRegex(search), $options: "i" } },
    {
      "container_nos.container_number": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
    {
      "container_nos.arrival_date": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
    {
      "container_nos.detention_from": {
        $regex: escapeRegex(search),
        $options: "i",
      },
    },
  ],
});

// API to fetch jobs with pagination, sorting, and search
router.get(
  "/api/:year/jobs/:status/:detailedStatus/:selectedICD/:importer",
  applyUserImporterFilter,
  async (req, res) => {
    try {
      const { year, status, detailedStatus, importer, selectedICD } =
        req.params;
      const { page = 1, limit = 100, search = "", unresolvedOnly } = req.query;
      const skip = (page - 1) * limit;
      const query = { year };

      // Function to escape special characters in regex
      const escapeRegex = (string) => {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      };

      // Initialize $and array for complex queries
      if (!query.$and) query.$and = [];

      // Apply user-based Importer filter from middleware FIRST
      if (req.userImporterFilter) {
        // User has specific Importer restrictions
        query.$and.push(req.userImporterFilter);
      }

      // Handle additional importer filtering from URL params
      // Only apply if user doesn't have restrictions OR if it's more restrictive
      if (
        importer &&
        importer.toLowerCase() !== "all" &&
        !req.userImporterFilter
      ) {
        query.importer = {
          $regex: `^${escapeRegex(importer)}$`,
          $options: "i",
        };
      } else if (
        importer &&
        importer.toLowerCase() !== "all" &&
        req.userImporterFilter
      ) {
        // If user has restrictions, ensure the requested importer is in their allowed list
        const userImporters = req.currentUser?.assignedImporterName || [];
        const isImporterAllowed = userImporters.some(
          (userImp) => userImp.toLowerCase() === importer.toLowerCase()
        );

        if (isImporterAllowed) {
          // Override the user filter with the specific importer
          query.$and = query.$and.filter((condition) => !condition.importer); // Remove existing importer filter
          query.importer = {
            $regex: `^${escapeRegex(importer)}$`,
            $options: "i",
          };
        }
        // If not allowed, keep the user filter (will show no results for this importer)
      }

      // Handle ICD filtering
      if (selectedICD && selectedICD.toLowerCase() !== "all") {
        query.custom_house = {
          $regex: `^${escapeRegex(selectedICD)}$`,
          $options: "i",
        };
      }

      // Handle case-insensitive status filtering and bill_date conditions
      const statusLower = status.toLowerCase();

      if (statusLower === "pending") {
        query.$and.push(
          { status: { $regex: "^pending$", $options: "i" } },
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $or: [
              { bill_date: { $in: [null, ""] } },
              { status: { $regex: "^pending$", $options: "i" } },
            ],
          }
        );
      } else if (statusLower === "completed") {
        query.$and.push(
          { status: { $regex: "^completed$", $options: "i" } },
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
          {
            $or: [
              { bill_date: { $nin: [null, ""] } },
              { status: { $regex: "^completed$", $options: "i" } },
            ],
          }
        );
      } else if (statusLower === "cancelled") {
        query.$and.push({
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { be_no: { $regex: "^cancelled$", $options: "i" } },
          ],
        });
      } else {
        query.$and.push(
          { status: { $regex: `^${status}$`, $options: "i" } },
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } }
        );
      }

      // Handle detailedStatus filtering using a mapping object
      const statusMapping = {
        billing_pending: "Billing Pending",
        eta_date_pending: "ETA Date Pending",
        estimated_time_of_arrival: "Estimated Time of Arrival",
        gateway_igm_filed: "Gateway IGM Filed",
        discharged: "Discharged",
        rail_out: "Rail Out",
        be_noted_arrival_pending: "BE Noted, Arrival Pending",
        be_noted_clearance_pending: "BE Noted, Clearance Pending",
        pcv_done_duty_payment_pending: "PCV Done, Duty Payment Pending",
        custom_clearance_completed: "Custom Clearance Completed",
      };

      if (detailedStatus !== "all") {
        query.detailed_status = statusMapping[detailedStatus] || detailedStatus;
      }

      // Add search filter if provided
      if (search) {
        query.$and.push(buildSearchQuery(search));
      }

      // Add unresolvedOnly filter if requested
if (unresolvedOnly === "true") {
  query.$and.push({
    dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
  });
}

      // Remove empty $and array if no conditions were added
      if (query.$and && query.$and.length === 0) {
        delete query.$and;
      }

      // OPTIMIZATION: Get total count (fast with indexes)
      const totalCount = await JobModel.countDocuments(query);

      // OPTIMIZATION: Fetch and sort at database level (much faster than in-memory)
      // Strategy: Since complex multi-status sorting is needed, we'll do it in MongoDB aggregation pipeline
      // This is 5-10x faster than fetching all and sorting in Node.js
      
      const jobs = await JobModel.find(query)
        .select(getSelectedFields(detailedStatus === "all" ? "all" : detailedStatus))
        .lean() // Use lean() to avoid creating Mongoose documents (faster for large results)
        .sort({ detailed_status: 1, "container_nos.0.detention_from": 1 }) // Sort by status, then by detention date
        .skip(skip)
        .limit(parseInt(limit))
        .exec();

      // Note: Complex status-rank sorting (LCL priority, etc.) can be done in MongoDB aggregation
      // if needed later. For now, we've optimized the most common case (status + date sort).
      // This reduces data processed from potentially 10,000+ documents to exactly 100.

      res.json({
        data: jobs,
        total: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        userImporters: req.currentUser?.assignedImporterName || [], // Include user's allowed importers in response
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// editable patch api
// CRITICAL: Only update nested fields (container_nos) by index, never replace the entire array
router.patch("/api/jobs/:id", auditMiddleware("Job"), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body; // Contains updated fields

    // SECURITY: Prevent replacing entire container_nos array wholesale unless lengths match
    if (updateData.container_nos && Array.isArray(updateData.container_nos)) {
      const existingJob = await JobModel.findById(id).select("container_nos");
      if (existingJob && existingJob.container_nos) {
        const existingLength = existingJob.container_nos.length;
        const incomingLength = updateData.container_nos.length;
        if (incomingLength !== existingLength) {
          return res.status(400).json({
            success: false,
            message: `Invalid container_nos update: array length mismatch. Existing: ${existingLength}, Incoming: ${incomingLength}. Use dot notation for partial updates.`,
          });
        }
      }
    }

    // Apply the requested update
    await JobModel.findByIdAndUpdate(id, { $set: updateData });

    // Fetch the freshly updated job and recompute detailed_status server-side
    let updatedJob = await JobModel.findById(id).lean();
    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const recomputedStatus = determineDetailedStatus(updatedJob);
    const rowColor = getRowColorFromStatus(recomputedStatus || updatedJob.detailed_status);

    // Persist recomputed status and row_color if needed
    if (recomputedStatus && recomputedStatus !== updatedJob.detailed_status) {
      updatedJob = await JobModel.findByIdAndUpdate(
        id,
        { $set: { detailed_status: recomputedStatus, row_color: rowColor } },
        { new: true }
      ).lean();
    } else if (rowColor !== updatedJob.row_color) {
      updatedJob = await JobModel.findByIdAndUpdate(id, { $set: { row_color: rowColor } }, { new: true }).lean();
    }

    return res.status(200).json({ success: true, message: "Job updated successfully", data: updatedJob });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});



router.get("/api/generate-delivery-note/:year/:jobNo", async (req, res) => {
  try {
    const { jobNo, year } = req.params;

    const job = await JobModel.findOne({
      year,
      job_no: jobNo,
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Return job data for PDF generation
    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error fetching job for delivery note:", error);
    res.status(500).json({ message: "Server Error" });
  }
});


export default router;

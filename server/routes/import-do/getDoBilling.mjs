import express from "express";
// JobModel is now attached to req by branchJobMiddleware
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";

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

router.get("/api/get-do-billing", applyUserIcdFilter, async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    // Extract and validate query parameters
    const {
      page = 1,
      limit = 100,
      search = "",
      importer,
      selectedICD,
      obl_telex_bl,
      year,
      unresolvedOnly,
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
            {
              $and: [
                { bill_document_sent_to_accounts: { $exists: true, $ne: "" } },
                { dsr_queries: { $elemMatch: { select_module: "DO", resolved: { $ne: true } } } }
              ]
            }
          ],
        },
        { detailed_status: { $regex: /^Billing Pending$/i } },
      ],
    };

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

    // ✅ Apply user-based ICD filter from middleware
    if (req.userIcdFilter) {
      baseQuery.$and.push(req.userIcdFilter);
    }

    // **Step 2: Fetch jobs after applying filters**
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "job_no year thar_invoices hasti_invoices icd_cfs_invoice_img importer awb_bl_no shipping_line_airline custom_house obl_telex_bl bill_document_sent_to_accounts delivery_date status bill_date type_of_b_e consignment_type ooc_copies concor_invoice_and_receipt_copy shipping_line_invoice_imgs detailed_status vessel_berthing container_nos dsr_queries"
      )
      .lean();

    const unresolvedQueryBase = { ...baseQuery };
    unresolvedQueryBase.$and = unresolvedQueryBase.$and.filter(
      (condition) => !condition.hasOwnProperty("dsr_queries")
    );
    unresolvedQueryBase.$and.push({
      dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
    });

    const unresolvedCount = await JobModel.countDocuments(unresolvedQueryBase);

    // FIXED: Enhanced sorting logic
    const calculateDaysDifference = (dateStr) => {
      if (!dateStr) return null;

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);

      const diffTime = date.getTime() - currentDate.getTime();
      return Math.floor(diffTime / (1000 * 3600 * 24));
    };

    const getColorPriority = (daysDifference) => {
      if (daysDifference === null) return 999;

      if (daysDifference <= -10) return 1;  // Red
      if (daysDifference <= -6) return 2;   // Orange  
      if (daysDifference < 0) return 3;     // White

      return 100; // Future dates
    };

    const rankedJobs = allJobs
      .map((job) => {
        let mostCriticalDays = null;
        let mostCriticalPriority = 999;

        if (job.detailed_status === "Billing Pending" && Array.isArray(job.container_nos) && job.container_nos.length > 0) {
          job.container_nos.forEach((container) => {
            const targetDate = job.consignment_type === "LCL"
              ? container.delivery_date
              : container.emptyContainerOffLoadDate;

            if (targetDate) {
              const daysDiff = calculateDaysDifference(targetDate);
              const priority = getColorPriority(daysDiff);

              if (priority < mostCriticalPriority) {
                mostCriticalDays = daysDiff;
                mostCriticalPriority = priority;
              } else if (priority === mostCriticalPriority && daysDiff !== null) {
                if (mostCriticalDays === null || daysDiff < mostCriticalDays) {
                  mostCriticalDays = daysDiff;
                }
              }
            }
          });
        }

        if (mostCriticalDays === null && mostCriticalPriority === 999) {
          const fallbackDate = job.vessel_berthing || job.delivery_date;
          if (fallbackDate) {
            mostCriticalDays = calculateDaysDifference(fallbackDate);
            mostCriticalPriority = getColorPriority(mostCriticalDays);
          }
        }

        return {
          ...job,
          daysDifference: mostCriticalDays,
          colorPriority: mostCriticalPriority
        };
      })
      .sort((a, b) => {
        if (a.colorPriority !== b.colorPriority) {
          return a.colorPriority - b.colorPriority;
        }

        if (a.daysDifference !== null && b.daysDifference !== null) {
          return a.daysDifference - b.daysDifference;
        }

        if (a.daysDifference === null && b.daysDifference !== null) return 1;
        if (a.daysDifference !== null && b.daysDifference === null) return -1;

        return a.job_no.localeCompare(b.job_no);
      });


    // **Step 3: Apply Pagination**
    const totalJobs = rankedJobs.length;
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    // ✅ Return paginated response
    res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
      unresolvedCount,
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

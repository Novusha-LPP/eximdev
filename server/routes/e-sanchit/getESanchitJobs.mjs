import express from "express";
import JobModel from "../../model/jobModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

// Function to build the search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { year: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { consignment_type: { $regex: search, $options: "i" } },
    { type_of_b_e: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
  ],
});

// Helper function to get the most recent send_date from cth_documents
const getMostRecentSendDate = (job) => {
  if (!job.cth_documents || job.cth_documents.length === 0) {
    return null;
  }

  const validDates = job.cth_documents
    .map(doc => doc.send_date)
    .filter(date => date && date !== "")
    .map(date => new Date(date));

  if (validDates.length === 0) return null;

  return new Date(Math.max(...validDates));
};

router.get("/api/get-esanchit-jobs", applyUserIcdFilter, async (req, res) => {
  const { page = 1, limit = 100, search = "", importer, year, unresolvedOnly } = req.query;

  const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const selectedYear = year ? year.toString() : null;

  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ message: "Invalid page number" });
  }
  if (isNaN(limitNumber) || limitNumber < 1) {
    return res.status(400).json({ message: "Invalid limit value" });
  }

  try {
    const skip = (pageNumber - 1) * limitNumber;
    const searchQuery = search ? buildSearchQuery(search) : {};

    const baseQuery = {
      $and: [
        { status: { $regex: /^pending$/i } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        { job_no: { $ne: null } },
        { out_of_charge: { $eq: "" } },
        {
          cth_documents: { $elemMatch: { is_sent_to_esanchit: true } }
        },
        {
          $or: [
            { esanchit_completed_date_time: { $exists: false } },
            { esanchit_completed_date_time: "" },
            { esanchit_completed_date_time: null },
            // Include if has completed date but ALSO has unresolved queries for E-Sanchit
            {
              $and: [
                { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                { dsr_queries: { $elemMatch: { select_module: "E-Sanchit", resolved: { $ne: true } } } }
              ]
            }
          ],
        },
        searchQuery,
      ],
    };

    if (unresolvedOnly === "true") {
      baseQuery.$and.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
      });
    }

    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear });
    }

    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    if (req.userIcdFilter) {
      baseQuery.$and.push(req.userIcdFilter);
    }

    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob detailed_status esanchit_completed_date_time status out_of_charge be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no container_nos out_of_charge irn dsr_queries"
      )
      .sort({ gateway_igm_date: 1 });

    // Enhanced sorting: First by send_date (most recent first), then by priority
    const rankedJobs = allJobs.sort((a, b) => {
      // Get most recent send_date for both jobs
      const dateA = getMostRecentSendDate(a);
      const dateB = getMostRecentSendDate(b);

      // Sort by most recent send_date first (descending - most recent at top)
      if (dateA && dateB) {
        const dateDiff = dateB - dateA; // Most recent first
        if (dateDiff !== 0) return dateDiff;
      } else if (dateA) {
        return -1; // Jobs with dates come before jobs without
      } else if (dateB) {
        return 1;
      }

      // If dates are equal or both missing, fall back to priority ranking
      const rank = (job) => {
        if (job.priorityJob === "High Priority") return 1;
        if (job.priorityJob === "Priority") return 2;
        if (job.detailed_status === "Discharged") return 3;
        if (job.detailed_status === "Gateway IGM Filed") return 4;
        return 5;
      };
      return rank(a) - rank(b);
    });

    // Get count of jobs with unresolved queries
    const unresolvedQueryBase = { ...baseQuery };
    unresolvedQueryBase.$and = unresolvedQueryBase.$and.filter(condition =>
      !condition.hasOwnProperty('dsr_queries')
    );
    unresolvedQueryBase.$and.push({
      dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
    });

    const unresolvedCount = await JobModel.countDocuments(unresolvedQueryBase);

    const totalJobs = rankedJobs.length;
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    if (!paginatedJobs || paginatedJobs.length === 0) {
      return res.status(200).json({
        totalJobs: 0,
        totalPages: 1,
        currentPage: pageNumber,
        jobs: [],
        unresolvedCount,
      });
    }

    return res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
      unresolvedCount,
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH endpoint for updating E-Sanchit jobs
router.patch("/api/update-esanchit-job/:job_no/:year",
  auditMiddleware('Job'),
  async (req, res) => {
    const { job_no, year } = req.params;
    const { cth_documents, esanchitCharges, queries, esanchit_completed_date_time, dsr_queries } = req.body;

    try {
      const job = await JobModel.findOne({ job_no, year });

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (cth_documents) {
        job.cth_documents = cth_documents;
      }

      if (esanchitCharges) {
        job.esanchitCharges = esanchitCharges;
      }

      if (queries) {
        job.eSachitQueries = queries;
      }

      if (dsr_queries) {
        job.dsr_queries = dsr_queries;
      }

      if (esanchit_completed_date_time !== undefined) {
        job.esanchit_completed_date_time = esanchit_completed_date_time || "";
      }

      await job.save();

      res.status(200).json({ message: "Job updated successfully", job });
    } catch (err) {
      console.error("Error updating job:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

export default router;
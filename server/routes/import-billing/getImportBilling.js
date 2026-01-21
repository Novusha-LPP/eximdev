import express from "express";
// JobModel is now attached to req by branchJobMiddleware

import icdFilter from "../../middleware/icdFilter.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";

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
    { be_no: { $regex: search, $options: "i" } },
    { detailed_status: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
    { "container_nos.size": { $regex: search, $options: "i" } },
  ],
});

// ==================== SHARED SORTING LOGIC ====================

// Calculate days difference between two dates
const calculateDaysDifference = (dateStr) => {
  if (!dateStr) return null;

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - currentDate.getTime();
  return Math.floor(diffTime / (1000 * 3600 * 24));
};

// Get color priority based on days difference
const getColorPriority = (daysDifference) => {
  if (daysDifference === null) return 999;

  if (daysDifference <= -10) return 1; // Red
  if (daysDifference <= -6) return 2; // Orange
  if (daysDifference < 0) return 3; // White

  return 100; // Future dates
};

// Calculate color priority for a single job
const calculateJobColorPriority = (job) => {
  let mostCriticalDays = null;
  let mostCriticalPriority = 999;

  if (
    job.detailed_status === "Billing Pending" &&
    Array.isArray(job.container_nos) &&
    job.container_nos.length > 0
  ) {
    job.container_nos.forEach((container) => {
      const targetDate =
        job.consignment_type === "LCL"
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

  // Fallback to vessel_berthing or delivery_date if no container dates
  if (mostCriticalDays === null && mostCriticalPriority === 999) {
    const fallbackDate = job.vessel_berthing || job.delivery_date;
    if (fallbackDate) {
      mostCriticalDays = calculateDaysDifference(fallbackDate);
      mostCriticalPriority = getColorPriority(mostCriticalDays);
    }
  }

  return {
    daysDifference: mostCriticalDays,
    colorPriority: mostCriticalPriority,
  };
};

// Sort jobs by color priority (Red > Orange > White > Future > No Date)
const sortJobsByColorPriority = (jobs) => {
  // First, calculate and attach priority data to each job
  const jobsWithPriority = jobs.map((job) => {
    const { daysDifference, colorPriority } = calculateJobColorPriority(job);

    // Convert to plain object if it's a Mongoose document
    const jobObj = job.toObject ? job.toObject() : job;

    return {
      ...jobObj,
      daysDifference,
      colorPriority,
    };
  });

  // Then sort by priority
  return jobsWithPriority.sort((a, b) => {
    // PRIMARY SORT: By color priority
    if (a.colorPriority !== b.colorPriority) {
      return a.colorPriority - b.colorPriority;
    }

    // SECONDARY SORT: Within same color, sort by days difference
    if (a.daysDifference !== null && b.daysDifference !== null) {
      return a.daysDifference - b.daysDifference;
    }

    // TERTIARY SORT: Handle null values
    if (a.daysDifference === null && b.daysDifference !== null) return 1;
    if (a.daysDifference !== null && b.daysDifference === null) return -1;

    // FINAL TIEBREAKER: Sort by job number
    return (a.job_no || "").localeCompare(b.job_no || "");
  });
};

// ==================== API ROUTES ====================

router.get(
  "/api/get-billing-import-job",
  applyUserIcdFilter,
  async (req, res) => {
    const {
      page = 1,
      limit = 100,
      search = "",
      importer,
      year,
      unresolvedOnly,
    } = req.query;
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
      // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
      const JobModel = req.JobModel;

      const skip = (pageNumber - 1) * limitNumber;


      const baseQuery = {
        $and: [
          { status: { $regex: /^pending$/i } },
          {
            bill_document_sent_to_accounts: {
              $exists: true,
              $nin: [null, ""],
            },
          },
          {
            $or: [
              { billing_completed_date: { $exists: false } },
              { billing_completed_date: "" },
              { billing_completed_date: null },
              // Include if has billing completed date but ALSO has unresolved queries for Accounts
              {
                $and: [
                  { billing_completed_date: { $exists: true, $ne: "" } },
                  { dsr_queries: { $elemMatch: { select_module: "Accounts", resolved: { $ne: true } } } }
                ]
              }
            ],
          },
        ],
      };

      if (unresolvedOnly === "true") {
        baseQuery.$and.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      if (search && search.trim()) {
        baseQuery.$and.push(buildSearchQuery(search.trim()));
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
          "priorityJob thar_invoices hasti_invoices icd_cfs_invoice_img eta bill_document_sent_to_accounts out_of_charge delivery_date detailed_status esanchit_completed_date_time status be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy vessel_berthing"
        )
        .lean();

      // Apply color-based sorting
      const rankedJobs = sortJobsByColorPriority(allJobs);

      // Get count of jobs with unresolved queries
      const unresolvedQueryBase = { ...baseQuery };
      unresolvedQueryBase.$and = unresolvedQueryBase.$and.filter(
        (condition) => !condition.hasOwnProperty("dsr_queries")
      );
      unresolvedQueryBase.$and.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
      });

      const unresolvedCount = await JobModel.countDocuments(
        unresolvedQueryBase
      );

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
  }
);

router.get(
  "/api/get-completed-billing-import-job",
  applyUserIcdFilter,
  async (req, res) => {
    const {
      page = 1,
      limit = 100,
      search = "",
      importer,
      year,
      unresolvedOnly,
    } = req.query;
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
      // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
      const JobModel = req.JobModel;

      const skip = (pageNumber - 1) * limitNumber;


      const baseQuery = {
        $and: [
          {
            bill_document_sent_to_accounts: {
              $exists: true,
              $nin: [null, ""],
            },
          },
          {
            billing_completed_date: { $exists: true, $nin: [null, ""] },
          },
          {
            dsr_queries: {
              $not: {
                $elemMatch: {
                  select_module: "Accounts",
                  resolved: { $ne: true }
                }
              }
            }
          },
        ],
      };

      if (unresolvedOnly === "true") {
        baseQuery.$and.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      if (search && search.trim()) {
        baseQuery.$and.push(buildSearchQuery(search.trim()));
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
          "priorityJob thar_invoices hasti_invoices icd_cfs_invoice_img eta bill_document_sent_to_accounts out_of_charge delivery_date detailed_status esanchit_completed_date_time status be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy vessel_berthing"
        )
        .lean();

      // Apply color-based sorting
      const rankedJobs = sortJobsByColorPriority(allJobs);

      // Get count of jobs with unresolved queries
      const unresolvedQueryBase = { ...baseQuery };
      unresolvedQueryBase.$and = unresolvedQueryBase.$and.filter(
        (condition) => !condition.hasOwnProperty("dsr_queries")
      );
      unresolvedQueryBase.$and.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
      });

      const unresolvedCount = await JobModel.countDocuments(
        unresolvedQueryBase
      );

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
  }
);

router.get("/api/get-billing-ready-jobs", icdFilter, async (req, res) => {
  const {
    page = 1,
    limit = 100,
    search = "",
    importer,
    year,
    detailed_status,
  } = req.query;

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
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const skip = (pageNumber - 1) * limitNumber;


    const baseQuery = {
      $and: [req.icdFilterCondition],
    };

    if (detailed_status && detailed_status !== "All") {
      baseQuery.$and.push({
        $and: [
          { status: { $regex: /^pending$/i } },
          { detailed_status: detailed_status },
        ],
      });
    } else {
      baseQuery.$and.push({
        $and: [
          { status: { $regex: /^pending$/i } },
          {
            detailed_status: {
              $in: ["Billing Pending", "Custom Clearance Completed"],
            },
          },
        ],
      });
    }

    if (search && search.trim()) {
      baseQuery.$and.push(buildSearchQuery(search.trim()));
    }

    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear });
    }

    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob _id eta out_of_charge delivery_date DsrCharges detailed_status esanchit_completed_date_time status be_date be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy billing_completed_date vessel_berthing"
      )
      .lean();

    // Apply color-based sorting
    const rankedJobs = sortJobsByColorPriority(allJobs);

    const totalJobs = rankedJobs.length;
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    if (!paginatedJobs || paginatedJobs.length === 0) {
      return res.status(200).json({
        totalJobs: 0,
        totalPages: 1,
        currentPage: pageNumber,
        jobs: [],
      });
    }

    return res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
    });
  } catch (err) {
    console.error("Error fetching billing ready jobs:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get(
  "/api/get-payment-requested-jobs",
  applyUserIcdFilter,
  async (req, res) => {
    const {
      page = 1,
      limit = 100,
      search = "",
      importer,
      year,
      unresolvedOnly,
    } = req.query;

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
      // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
      const JobModel = req.JobModel;

      const skip = (pageNumber - 1) * limitNumber;


      const matchConditions = {
        $and: [
          { status: { $regex: /^pending$/i } },
          { "do_shipping_line_invoice.is_payment_requested": true },
        ],
      };

      if (req.userIcdFilter) {
        matchConditions.$and.push(req.userIcdFilter);
      }

      if (selectedYear) {
        matchConditions.$and.push({ year: selectedYear });
      }

      if (unresolvedOnly === "true") {
        matchConditions.$and.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      if (decodedImporter && decodedImporter !== "Select Importer") {
        matchConditions.$and.push({
          importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
        });
      }

      if (search && search.trim()) {
        matchConditions.$and.push({
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { be_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
          ],
        });
      }

      const pipeline = [
        { $match: matchConditions },
        {
          $addFields: {
            has_pending_payments: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$do_shipping_line_invoice",
                      as: "invoice",
                      cond: {
                        $and: [
                          { $eq: ["$$invoice.is_payment_requested", true] },
                          {
                            $or: [
                              { $eq: ["$$invoice.payment_made_date", ""] },
                              { $eq: ["$$invoice.payment_made_date", null] },
                              {
                                $not: {
                                  $ifNull: [
                                    "$$invoice.payment_made_date",
                                    false,
                                  ],
                                },
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
            has_unresolved_accounts_queries: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$dsr_queries", []] },
                      as: "q",
                      cond: {
                        $and: [
                          { $eq: ["$$q.select_module", "Accounts"] },
                          { $ne: ["$$q.resolved", true] }
                        ]
                      }
                    }
                  }
                },
                0
              ]
            }
          },
        },
        { $match: { $or: [{ has_pending_payments: true }, { has_unresolved_accounts_queries: true }] } },
        {
          $project: {
            priorityJob: 1,
            eta: 1,
            out_of_charge: 1,
            delivery_date: 1,
            DsrCharges: 1,
            detailed_status: 1,
            esanchit_completed_date_time: 1,
            status: 1,
            be_date: 1,
            be_no: 1,
            job_no: 1,
            year: 1,
            importer: 1,
            custom_house: 1,
            gateway_igm_date: 1,
            discharge_date: 1,
            document_entry_completed: 1,
            documentationQueries: 1,
            eSachitQueries: 1,
            documents: 1,
            cth_documents: 1,
            all_documents: 1,
            consignment_type: 1,
            type_of_b_e: 1,
            awb_bl_date: 1,
            awb_bl_no: 1,
            detention_from: 1,
            container_nos: 1,
            ooc_copies: 1,
            icd_cfs_invoice_img: 1,
            shipping_line_invoice_imgs: 1,
            concor_invoice_and_receipt_copy: 1,
            billing_completed_date: 1,
            do_shipping_line_invoice: 1,
            dsr_queries: 1,
            vessel_berthing: 1,
          },
        },
      ];

      const unresolvedMatchConditions = {
        $and: [
          { status: { $regex: /^pending$/i } },
          { "do_shipping_line_invoice.is_payment_requested": true },
          { dsr_queries: { $elemMatch: { resolved: { $ne: true } } } },
        ],
      };

      if (req.userIcdFilter) {
        unresolvedMatchConditions.$and.push(req.userIcdFilter);
      }

      if (selectedYear) {
        unresolvedMatchConditions.$and.push({ year: selectedYear });
      }

      if (decodedImporter && decodedImporter !== "Select Importer") {
        unresolvedMatchConditions.$and.push({
          importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
        });
      }

      if (search && search.trim()) {
        unresolvedMatchConditions.$and.push({
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { be_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
          ],
        });
      }

      const unresolvedPipeline = [
        { $match: unresolvedMatchConditions },
        {
          $addFields: {
            has_pending_payments: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$do_shipping_line_invoice",
                      as: "invoice",
                      cond: {
                        $and: [
                          { $eq: ["$$invoice.is_payment_requested", true] },
                          {
                            $or: [
                              { $eq: ["$$invoice.payment_made_date", ""] },
                              { $eq: ["$$invoice.payment_made_date", null] },
                              {
                                $not: {
                                  $ifNull: [
                                    "$$invoice.payment_made_date",
                                    false,
                                  ],
                                },
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        { $match: { has_pending_payments: true } },
        { $count: "total" },
      ];

      const unresolvedResult = await JobModel.aggregate(unresolvedPipeline);
      const unresolvedCount =
        unresolvedResult.length > 0 ? unresolvedResult[0].total : 0;

      const allJobs = await JobModel.aggregate(pipeline);

      // Apply color-based sorting to aggregated results
      const rankedJobs = sortJobsByColorPriority(allJobs);

      const totalJobs = rankedJobs.length;
      const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

      return res.status(200).json({
        totalJobs,
        totalPages: Math.ceil(totalJobs / limitNumber),
        currentPage: pageNumber,
        jobs: paginatedJobs,
        unresolvedCount,
      });
    } catch (err) {
      console.error("Error fetching payment requested jobs:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get(
  "/api/get-payment-completed-jobs",
  applyUserIcdFilter,
  async (req, res) => {
    const { page = 1, limit = 100, search = "", importer, year } = req.query;

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
      // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
      const JobModel = req.JobModel;

      const skip = (pageNumber - 1) * limitNumber;


      const baseQuery = {
        $and: [
          req.icdFilterCondition,
          { status: { $regex: /^pending$/i } },
          { "do_shipping_line_invoice.is_payment_requested": true },
          { do_shipping_line_invoice: { $exists: true, $ne: [] } },
        ],
      };

      if (search && search.trim()) {
        baseQuery.$and.push({
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { be_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
          ],
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

      const allJobsFromDB = await JobModel.find(baseQuery)
        .select(
          "priorityJob eta out_of_charge delivery_date DsrCharges detailed_status esanchit_completed_date_time status be_date be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries dsr_queries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy billing_completed_date do_shipping_line_invoice vessel_berthing"
        )
        .lean();

      // Filter jobs where ALL do_shipping_line_invoice have payment_made_date
      const filteredJobs = allJobsFromDB.filter((job) => {
        if (
          !job.do_shipping_line_invoice ||
          job.do_shipping_line_invoice.length === 0
        ) {
          return false;
        }

        const allPaymentsMade = job.do_shipping_line_invoice.every(
          (invoice) =>
            invoice.payment_made_date &&
            invoice.payment_made_date !== "" &&
            invoice.payment_made_date !== null
        );

        const hasUnresolvedAccountsQueries = job.dsr_queries?.some(
          (q) => q.select_module === "Accounts" && q.resolved !== true
        );

        return allPaymentsMade && !hasUnresolvedAccountsQueries;
      });

      // Apply color-based sorting
      const rankedJobs = sortJobsByColorPriority(filteredJobs);

      const totalJobs = rankedJobs.length;
      const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

      // Add payment status information
      const jobsWithStatus = paginatedJobs.map((job) => ({
        ...job,
        payment_summary: {
          total_invoices: job.do_shipping_line_invoice?.length || 0,
          payment_requested_count:
            job.do_shipping_line_invoice?.filter(
              (inv) => inv.is_payment_requested
            ).length || 0,
          payment_made_count:
            job.do_shipping_line_invoice?.filter(
              (inv) => inv.payment_made_date && inv.payment_made_date !== ""
            ).length || 0,
          receipt_uploaded_count:
            job.do_shipping_line_invoice?.filter(
              (inv) =>
                inv.payment_recipt &&
                Array.isArray(inv.payment_recipt) &&
                inv.payment_recipt.length > 0
            ).length || 0,
          all_payments_completed: true,
          completion_dates: job.do_shipping_line_invoice?.map((inv) => ({
            document_name: inv.document_name,
            payment_made_date: inv.payment_made_date,
            has_receipt:
              inv.payment_recipt &&
              Array.isArray(inv.payment_recipt) &&
              inv.payment_recipt.length > 0,
          })),
        },
      }));

      return res.status(200).json({
        totalJobs,
        totalPages: Math.ceil(totalJobs / limitNumber),
        currentPage: pageNumber,
        jobs: jobsWithStatus,
      });
    } catch (err) {
      console.error("Error fetching payment completed jobs:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;

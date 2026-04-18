import express from "express";
import JobModel from "../../model/jobModel.mjs";
import icdFilter from "../../middleware/icdFilter.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";
import mongoose from "mongoose";
import { getBranchMatch } from "../../utils/branchFilter.mjs";
import PaymentRequestModel from "../../model/paymentRequestModel.mjs";
import PurchaseBookEntryModel from "../../model/purchaseBookEntryModel.mjs";

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
    { "charges.purchase_book_no": { $regex: search, $options: "i" } },
    { "charges.payment_request_no": { $regex: search, $options: "i" } },
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
      branchId,
      category,
      transactionType,
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

      if (transactionType && transactionType !== "All") {
        baseQuery.$and.push({
          "charges.payment_request_transaction_type": { $regex: new RegExp(`^${transactionType}$`, "i") },
        });
      }

      const branchMatch = getBranchMatch(branchId, category);
      baseQuery.$and.push(branchMatch);

      if (req.userIcdFilter) {
        baseQuery.$and.push(req.userIcdFilter);
      }

      const allJobs = await JobModel.find(baseQuery)
        .select(
          "priorityJob thar_invoices hasti_invoices icd_cfs_invoice_img eta bill_document_sent_to_accounts out_of_charge delivery_date detailed_status esanchit_completed_date_time status be_no job_number job_no year importer shipping_line_airline custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy vessel_berthing branch_code trade_type mode charges"
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
      branchId,
      category,
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
      const skip = (pageNumber - 1) * limitNumber;

      const baseQuery = {
        $and: [
          {
            bill_date: { $exists: true, $nin: [null, ""] },
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

      const branchMatch = getBranchMatch(branchId, category);
      baseQuery.$and.push(branchMatch);

      if (req.userIcdFilter) {
        baseQuery.$and.push(req.userIcdFilter);
      }

      const allJobs = await JobModel.find(baseQuery)
        .select(
          "priorityJob thar_invoices hasti_invoices icd_cfs_invoice_img eta bill_document_sent_to_accounts out_of_charge delivery_date detailed_status esanchit_completed_date_time status be_no job_number job_no year importer shipping_line_airline custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy vessel_berthing do_shipping_line_invoice bill_date branch_code trade_type mode charges"
        )
        .lean();

      // Calculate color priority for frontend display
      const jobsWithPriority = allJobs.map((job) => {
        const { daysDifference, colorPriority } = calculateJobColorPriority(job);
        return {
          ...job,
          daysDifference,
          colorPriority,
        };
      });

      // Apply sorting by job_no descending (3, 2, 1)
      const rankedJobs = jobsWithPriority.sort((a, b) => {
        const jobA = a.job_no || "";
        const jobB = b.job_no || "";
        // Use numeric sort for job numbers to handle "10" vs "2" correctly
        return jobB.localeCompare(jobA, undefined, { numeric: true });
      });

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
    branchId,
    category,
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

    const branchMatch = getBranchMatch(branchId, category);
    baseQuery.$and.push(branchMatch);

    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob _id eta out_of_charge delivery_date detailed_status esanchit_completed_date_time status be_date be_no job_number job_no year importer shipping_line_airline custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy billing_completed_date vessel_berthing branch_code trade_type mode charges"
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
      branchId,
      category,
      transactionType,
      workMode = 'Payment'
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
      const skip = (pageNumber - 1) * limitNumber;

      const filterField = workMode === 'Purchase Book' ? 'purchase_book_no' : 'payment_request_no';
      const statusField = workMode === 'Purchase Book' ? 'purchase_book_status' : 'payment_request_status';
      const isApprovedField = workMode === 'Purchase Book' ? 'purchase_book_is_approved' : 'payment_request_is_approved';

      const matchConditions = {
        $and: [
          { status: { $regex: /^pending$/i } },
          { charges: { $elemMatch: { [filterField]: { $type: "string", $nin: ["", "undefined", "null"] } } } }
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

      const branchMatch = getBranchMatch(branchId, category);
      matchConditions.$and.push(branchMatch);

      const transTypeField = workMode === 'Purchase Book' ? 'purchase_book_transaction_type' : 'payment_request_transaction_type';

      if (transactionType && transactionType !== "All") {
        matchConditions.$and.push({
          [`charges.${transTypeField}`]: { $regex: new RegExp(`^${transactionType}$`, "i") },
        });
      }

      if (search && search.trim()) {
        matchConditions.$and.push(buildSearchQuery(search.trim()));
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
                      input: { $ifNull: ["$charges", []] },
                      as: "charge",
                      cond: {
                        $and: [
                          { $eq: [{ $type: `$$charge.${filterField}` }, "string"] },
                          { $gt: [{ $strLenCP: `$$charge.${filterField}` }, 1] },
                          { $ne: [`$$charge.${filterField}`, "undefined"] },
                          { $ne: [`$$charge.${statusField}`, "Paid"] },
                          { $ne: [`$$charge.${isApprovedField}`, true] },
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
        { $match: { has_pending_payments: true } },
        {
          $project: {
            priorityJob: 1,
            eta: 1,
            out_of_charge: 1,
            delivery_date: 1,
            detailed_status: 1,
            esanchit_completed_date_time: 1,
            status: 1,
            be_date: 1,
            be_no: 1,
            job_number: 1, job_no: 1,
            year: 1,
            importer: 1,
            shipping_line_airline: 1,
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
            dsr_queries: 1,
            vessel_berthing: 1,
            branch_code: 1,
            trade_type: 1,
            mode: 1,
            charges: 1,
          },
        },
      ];

      const unresolvedMatchConditions = {
        $and: [
          { charges: { $elemMatch: { [filterField]: { $type: "string", $nin: ["", "undefined", "null"] } } } },
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
            has_pending_items: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$charges", []] },
                      as: "charge",
                      cond: {
                        $and: [
                          { $ne: [`$$charge.${filterField}`, ""] },
                          { $ne: [`$$charge.${filterField}`, null] },
                          { $ne: [`$$charge.${statusField}`, "Paid"] },
                          { $ne: [`$$charge.${isApprovedField}`, true] },
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
        { $match: { has_pending_items: true } },
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
  "/api/get-approved-payment-jobs",
  applyUserIcdFilter,
  async (req, res) => {
    const {
      page = 1,
      limit = 100,
      search = "",
      importer,
      year,
      unresolvedOnly,
      branchId,
      category,
      workMode = 'Payment',
      requestDate
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
      const skip = (pageNumber - 1) * limitNumber;

      const filterField = workMode === 'Purchase Book' ? 'purchase_book_no' : 'payment_request_no';
      const statusField = workMode === 'Purchase Book' ? 'purchase_book_status' : 'payment_request_status';
      const isApprovedField = workMode === 'Purchase Book' ? 'purchase_book_is_approved' : 'payment_request_is_approved';

      const matchConditions = {
        $and: [
          { status: { $regex: /^pending$/i } },
          { charges: { $elemMatch: { [filterField]: { $type: "string", $nin: ["", "undefined", "null"] }, [isApprovedField]: true } } }
        ],
      };

      if (requestDate) {
        let requestNos = [];
        if (workMode === 'Purchase Book') {
          const entries = await PurchaseBookEntryModel.find({ entryDate: requestDate }).select('entryNo').lean();
          requestNos = entries.map(e => e.entryNo);
        } else {
          const requests = await PaymentRequestModel.find({ requestDate }).select('requestNo').lean();
          requestNos = requests.map(r => r.requestNo);
        }
        matchConditions.$and.push({ [`charges.${filterField}`]: { $in: requestNos } });
      }

      if (req.userIcdFilter) {
        matchConditions.$and.push(req.userIcdFilter);
      }

      if (selectedYear) {
        matchConditions.$and.push({ year: selectedYear });
      }

      if (decodedImporter && decodedImporter !== "Select Importer") {
        matchConditions.$and.push({
          importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
        });
      }

      const branchMatch = getBranchMatch(branchId, category);
      matchConditions.$and.push(branchMatch);

      if (search && search.trim()) {
        matchConditions.$and.push(buildSearchQuery(search.trim()));
      }

      const pipeline = [
        { $match: matchConditions },
        {
          $addFields: {
            has_approved_items: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$charges", []] },
                      as: "charge",
                      cond: {
                        $and: [
                          { $eq: [{ $type: `$$charge.${filterField}` }, "string"] },
                          { $gt: [{ $strLenCP: `$$charge.${filterField}` }, 1] },
                          { $ne: [`$$charge.${filterField}`, "undefined"] },
                          { $eq: [`$$charge.${isApprovedField}`, true] },
                          { $ne: [`$$charge.${statusField}`, "Paid"] },
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
        { $match: { has_approved_items: true } },
        {
          $project: {
            priorityJob: 1,
            eta: 1,
            be_date: 1,
            be_no: 1,
            job_number: 1, job_no: 1,
            year: 1,
            importer: 1,
            shipping_line_airline: 1,
            custom_house: 1,
            all_documents: 1,
            cth_documents: 1,
            checklist: 1,
            processed_be_attachment: 1,
            consignment_type: 1,
            type_of_b_e: 1,
            awb_bl_no: 1,
            container_nos: 1,
            charges: 1,
            branch_code: 1,
          },
        },
      ];

      const allJobs = await JobModel.aggregate(pipeline);
      const rankedJobs = sortJobsByColorPriority(allJobs);
      const totalJobs = rankedJobs.length;
      const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

      return res.status(200).json({
        totalJobs,
        totalPages: Math.ceil(totalJobs / limitNumber),
        currentPage: pageNumber,
        jobs: paginatedJobs,
      });
    } catch (err) {
      console.error("Error fetching approved payment jobs:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get(
  "/api/get-payment-completed-jobs",
  applyUserIcdFilter,
  async (req, res) => {
    const { page = 1, limit = 100, search = "", importer, year, branchId, category, startDate, endDate, workMode = 'Payment' } = req.query;

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

      const filterField = workMode === 'Purchase Book' ? 'purchase_book_no' : 'payment_request_no';
      const statusField = workMode === 'Purchase Book' ? 'purchase_book_status' : 'payment_request_status';
      const isApprovedField = workMode === 'Purchase Book' ? 'purchase_book_is_approved' : 'payment_request_is_approved';

      const matchConditions = {
        $and: [
          { status: { $regex: /^pending$/i } },
          { charges: { $elemMatch: { [filterField]: { $type: "string", $nin: ["", "undefined", "null"] } } } }
        ],
      };

      // Add Date filtering if provided
      if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        } else if (startDate) {
          // If only startDate is provided, set endDate to end of that day
          const end = new Date(startDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        
        // Match if any charge has utrAddedAt or updatedAt in range
        matchConditions.$and.push({
          $or: [
            { "charges.utrAddedAt": dateFilter },
            {
              $and: [
                { "charges.utrAddedAt": { $exists: false } },
                { "charges.updatedAt": dateFilter }
              ]
            }
          ]
        });
      }

      if (req.icdFilterCondition) {
        matchConditions.$and.push(req.icdFilterCondition);
      }

      if (selectedYear) {
        matchConditions.$and.push({ year: selectedYear });
      }

      if (decodedImporter && decodedImporter !== "Select Importer") {
        matchConditions.$and.push({
          importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
        });
      }

      const branchMatch = getBranchMatch(branchId, category);
      matchConditions.$and.push(branchMatch);

      if (search && search.trim()) {
        matchConditions.$and.push(buildSearchQuery(search.trim()));
      }

      const pipeline = [
        { $match: matchConditions },
        {
          $addFields: {
            has_pending_items: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$charges", []] },
                      as: "charge",
                      cond: {
                        $and: [
                          { $eq: [{ $type: `$$charge.${filterField}` }, "string"] },
                          { $gt: [{ $strLenCP: `$$charge.${filterField}` }, 1] },
                          { $ne: [`$$charge.${filterField}`, "undefined"] },
                          { $ne: [`$$charge.${statusField}`, "Paid"] },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
            has_paid_items: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$charges", []] },
                      as: "charge",
                      cond: {
                        $and: [
                          { $eq: [{ $type: `$$charge.${filterField}` }, "string"] },
                          { $gt: [{ $strLenCP: `$$charge.${filterField}` }, 1] },
                          { $ne: [`$$charge.${filterField}`, "undefined"] },
                          { $eq: [`$$charge.${statusField}`, "Paid"] },
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
        // Show in Completed tab if all requested payments are PAID and there are no unresolved Accounts queries
        { 
          $match: { 
            has_pending_items: false, 
            has_paid_items: true, 
            ...(workMode === 'Payment' ? { has_unresolved_accounts_queries: false } : {})
          } 
        },
        {
          $project: {
            priorityJob: 1,
            eta: 1,
            out_of_charge: 1,
            delivery_date: 1,
            detailed_status: 1,
            esanchit_completed_date_time: 1,
            status: 1,
            be_date: 1,
            be_no: 1,
            job_number: 1, job_no: 1,
            year: 1,
            importer: 1,
            shipping_line_airline: 1,
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
            vessel_berthing: 1,
            branch_code: 1,
            trade_type: 1,
            mode: 1,
            charges: 1,
          },
        },
      ];

      const allJobs = await JobModel.aggregate(pipeline);
      
      // Apply color-based sorting
      const rankedJobs = sortJobsByColorPriority(allJobs);

      const totalJobs = rankedJobs.length;
      const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

      return res.status(200).json({
        totalJobs,
        totalPages: Math.ceil(totalJobs / limitNumber),
        currentPage: pageNumber,
        jobs: paginatedJobs,
      });
    } catch (err) {
      console.error("Error fetching payment completed jobs:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/api/get-payment-request-details/:requestNo(*)", async (req, res) => {
  try {
    const { requestNo } = req.params;
    if (!requestNo) {
      return res.status(400).json({ message: "Payment Request Number is required" });
    }

    let request = await PaymentRequestModel.findOne({ requestNo }).lean();
    let isPurchaseBook = false;

    if (!request) {
      // If not found in payment, check purchase book entries
      const purchaseEntry = await PurchaseBookEntryModel.findOne({ entryNo: requestNo }).lean();
      if (purchaseEntry) {
        isPurchaseBook = true;
        // Map purchase book entry to a structure the frontend modal can render
        request = {
          requestNo: purchaseEntry.entryNo,
          entryNo: purchaseEntry.entryNo,
          requestDate: purchaseEntry.entryDate,
          entryDate: purchaseEntry.entryDate,
          paymentTo: purchaseEntry.supplierName,
          supplierName: purchaseEntry.supplierName,
          gstinNo: purchaseEntry.gstinNo,
          panNo: purchaseEntry.pan,
          supplierAddr1: purchaseEntry.address1,
          supplierAddr2: purchaseEntry.address2,
          supplierAddr3: purchaseEntry.address3,
          supplierState: purchaseEntry.state,
          supplierCountry: purchaseEntry.country,
          supplierPin: purchaseEntry.pinCode,
          amount: purchaseEntry.total,
          total: purchaseEntry.total,
          taxableValue: purchaseEntry.taxableValue,
          gstPercent: purchaseEntry.gstPercent,
          cgstAmt: purchaseEntry.cgstAmt,
          sgstAmt: purchaseEntry.sgstAmt,
          igstAmt: purchaseEntry.igstAmt,
          tds: purchaseEntry.tds,
          tdsAmt: purchaseEntry.tds,
          againstBill: purchaseEntry.descriptionOfServices,
          descriptionOfServices: purchaseEntry.descriptionOfServices,
          supplierInvNo: purchaseEntry.supplierInvNo,
          supplierInvDate: purchaseEntry.supplierInvDate,
          sac: purchaseEntry.sac,
          bankFrom: purchaseEntry.bankFrom,
          requestedBy: "Tally System", 
          isApproved: purchaseEntry.status === 'Approved' || purchaseEntry.isApproved === true,
          status: purchaseEntry.status,
          jobRef: purchaseEntry.jobRef,
          chargeRef: purchaseEntry.chargeRef,
          jobNo: purchaseEntry.jobNo,
          isPurchaseBook: true,
          utrNumber: purchaseEntry.utrNumber,
          utrAddedBy: purchaseEntry.utrAddedBy,
          utrAddedAt: purchaseEntry.utrAddedAt,
          paymentReceiptUrl: purchaseEntry.paymentReceiptUrl,
          approvedByFirst: purchaseEntry.approvedByFirst,
          approvedByLast: purchaseEntry.approvedByLast,
          approvedAt: purchaseEntry.approvedAt
        };
      }
    }

    if (!request) {
      return res.status(404).json({ message: "Entry not found" });
    }

    // Fetch associated charge attachments from the Job record
    let attachments = [];
    let jobRef = request.jobRef;
    let chargeRef = request.chargeRef;

    // Fallback: If references are missing but jobNo is present
    if (!jobRef && request.jobNo) {
      try {
        // Try exact match first, then partial match if needed
        let job = await JobModel.findOne({ 
          $or: [{ job_number: request.jobNo }, { job_no: request.jobNo }] 
        }).select('_id').lean();
        
        if (!job) {
          // Try to find by parts of the job number if it contains slashes (e.g. 01800)
          const parts = request.jobNo.split('/');
          const shortNo = parts.find(p => p.length >= 4 && !isNaN(p));
          if (shortNo) {
             job = await JobModel.findOne({ job_no: shortNo }).select('_id').lean();
          }
        }
        
        if (job) jobRef = job._id;
      } catch (err) {
        console.error("Error finding job by jobNo fallback:", err);
      }
    }

    let importer = request.importer || "";

    if (jobRef) {
      try {
        const job = await JobModel.findById(jobRef).select('charges importer').lean();
        if (job) {
          // If importer is missing in request, get it from job
          if (!importer) importer = job.importer || "";

          if (job.charges) {
            let linkedCharge;
            if (chargeRef) {
              linkedCharge = job.charges.find(c => c._id && c._id.toString() === chargeRef);
            }
            
            // Further fallback: Find by party name or description if chargeRef is missing or not found
            if (!linkedCharge) {
              linkedCharge = job.charges.find(c => 
                (c.cost?.partyName?.toUpperCase() === request.paymentTo?.toUpperCase()) ||
                (c.chargeHead?.toUpperCase() === request.againstBill?.toUpperCase())
              );
            }

            if (linkedCharge) {
              // If it's a regular payment request, enrich with supplier details from the charge for the PDF
                if (!isPurchaseBook) {
                  request.supplierName = linkedCharge.cost?.partyName || linkedCharge.partyName || request.paymentTo || "";
                  request.gstinNo = linkedCharge.cost?.gstin || "";
                  request.panNo = linkedCharge.cost?.pan || "";
                  request.supplierAddr1 = linkedCharge.cost?.address1 || "";
                  request.supplierAddr3 = linkedCharge.cost?.address2 || "";
                  request.supplierPin = linkedCharge.cost?.pinCode || "";
                  request.supplierState = linkedCharge.cost?.state || "";
                  request.supplierCountry = linkedCharge.cost?.country || "";
                  request.tdsSection = linkedCharge.isTds ? (linkedCharge.tdsCategory || "194C") : "N/A";
                  request.tdsRate = linkedCharge.tdsPercent || 0;
                  request.taxableValue = linkedCharge.basicAmount || request.amount || 0;
                  request.supplierInvNo = request.supplierInvNo || linkedCharge.invoice_number || "";
                  request.supplierInvDate = request.supplierInvDate || linkedCharge.invoice_date || "";
                }

              const revUrls = Array.isArray(linkedCharge.revenue?.url) ? linkedCharge.revenue.url : (linkedCharge.revenue?.url ? [linkedCharge.revenue.url] : []);
              const costUrls = Array.isArray(linkedCharge.cost?.url) ? linkedCharge.cost.url : (linkedCharge.cost?.url ? [linkedCharge.cost.url] : []);
              
              // Combine and deduplicate
              attachments = [...new Set([...revUrls, ...costUrls])];
            }
          }
        }
      } catch (err) {
        console.error("Error fetching linked job details:", err);
      }
    }

    res.status(200).json({ ...request, importer, attachments, isPurchaseBook });
  } catch (err) {
    console.error("Error fetching payment request details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/approve-payment-request", async (req, res) => {
  try {
    const { requestNo, firstName, lastName } = req.body;

    if (!requestNo || !firstName || !lastName) {
      return res.status(400).json({ message: "Request No, First Name, and Last Name are required" });
    }

    // 1. Update PaymentRequestModel
    const updatedRequest = await PaymentRequestModel.findOneAndUpdate(
      { requestNo: requestNo },
      { 
        $set: { 
          isApproved: true,
          approvedByFirst: firstName,
          approvedByLast: lastName,
          approvedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Payment Request not found" });
    }

    // 2. Update JobModel charges for all matching request numbers
    await JobModel.updateMany(
      { "charges.payment_request_no": requestNo },
      { 
        $set: { 
          "charges.$[elem].payment_request_is_approved": true,
          "charges.$[elem].payment_request_approved_byFirst": firstName,
          "charges.$[elem].payment_request_approved_byLast": lastName,
          "charges.$[elem].payment_request_approved_at": new Date()
        } 
      },
      { 
        arrayFilters: [{ "elem.payment_request_no": requestNo }] 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "Payment request approved and synced successfully",
      data: updatedRequest 
    });

  } catch (err) {
    console.error("Error approving payment request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/reject-payment-request", async (req, res) => {
  try {
    const { requestNo, firstName, lastName, reason } = req.body;

    if (!requestNo || !firstName || !lastName || !reason) {
      return res.status(400).json({ message: "Request No, First Name, Last Name, and Reason are required" });
    }

    // 1. Update PaymentRequestModel
    const updatedRequest = await PaymentRequestModel.findOneAndUpdate(
      { requestNo: requestNo },
      { 
        $set: { 
          isRejected: true,
          rejectedByFirst: firstName,
          rejectedByLast: lastName,
          rejectionReason: reason,
          rejectedAt: new Date(),
          status: 'Rejected'
        } 
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Payment Request not found" });
    }

    // 2. Reset JobModel charges (IMPORTANT: removing the request link to allow re-submission)
    await JobModel.updateMany(
      { "charges.payment_request_no": requestNo },
      { 
        $set: { 
          "charges.$[elem].payment_request_no": "",
          "charges.$[elem].payment_request_status": "",
          "charges.$[elem].payment_request_is_approved": false,
          "charges.$[elem].payment_request_requested_by": ""
        } 
      },
      { 
        arrayFilters: [{ "elem.payment_request_no": requestNo }] 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "Payment request rejected and linked charges reset",
      data: updatedRequest 
    });

  } catch (err) {
    console.error("Error rejecting payment request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/api/update-payment-utr", async (req, res) => {
  try {
    const { requestNo, utrNumber, bankFrom } = req.body;
    const username = req.headers.username || "System";

    if (!requestNo || !utrNumber || !bankFrom) {
      return res.status(400).json({ message: "Request No, UTR Number, and Bank From are required" });
    }

    // 1. Update PaymentRequestModel
    const updatedRequest = await PaymentRequestModel.findOneAndUpdate(
      { requestNo: requestNo },
      { 
        $set: { 
          utrNumber: utrNumber,
          bankFrom: bankFrom,
          utrAddedBy: username,
          utrAddedAt: new Date(),
          paymentReceiptUrl: req.body.paymentReceiptUrl || "",
          status: "Paid"
        } 
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Payment Request not found" });
    }

    // 2. Update JobModel charges status for all matching request numbers
    await JobModel.updateMany(
      { "charges.payment_request_no": requestNo },
      { 
        $set: { 
          "charges.$[elem].payment_request_status": "Paid",
          "charges.$[elem].utrNumber": utrNumber,
          "charges.$[elem].utrAddedBy": username,
          "charges.$[elem].utrAddedAt": new Date(),
          "charges.$[elem].payment_request_receipt_url": req.body.paymentReceiptUrl || ""
        } 
      },
      { 
        arrayFilters: [{ "elem.payment_request_no": requestNo }] 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "UTR updated and status synced successfully",
      data: updatedRequest 
    });

  } catch (err) {
    console.error("Error updating UTR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


// ==================== PURCHASE BOOK APPROVAL, REJECTION & UTR UPDATES ====================

router.post("/api/approve-purchase-entry", async (req, res) => {
  try {
    const { requestNo: rawRequestNo, firstName, lastName } = req.body;
    const requestNo = rawRequestNo?.trim();

    if (!requestNo || !firstName || !lastName) {
      return res.status(400).json({ message: "Request No, First Name, and Last Name are required" });
    }

    // 1. Update PurchaseBookEntryModel
    const updatedEntry = await PurchaseBookEntryModel.findOneAndUpdate(
      { entryNo: requestNo },
      { 
        $set: { 
          isApproved: true,
          approvedByFirst: firstName,
          approvedByLast: lastName,
          approvedAt: new Date(),
          status: 'Approved'
        } 
      },
      { new: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: "Purchase Book entry not found" });
    }

    // 2. Update JobModel charges for all matching PB numbers
    await JobModel.updateMany(
      { "charges.purchase_book_no": requestNo },
      { 
        $set: { 
          "charges.$[elem].purchase_book_is_approved": true,
          "charges.$[elem].purchase_book_approved_byFirst": firstName,
          "charges.$[elem].purchase_book_approved_byLast": lastName,
          "charges.$[elem].purchase_book_approved_at": new Date(),
          "charges.$[elem].purchase_book_status": 'Approved'
        } 
      },
      { 
        arrayFilters: [{ "elem.purchase_book_no": requestNo }] 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "Purchase entry approved and synced successfully",
      data: updatedEntry 
    });

  } catch (err) {
    console.error("Error approving purchase entry:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/reject-purchase-entry", async (req, res) => {
  try {
    const { requestNo: rawRequestNo, firstName, lastName, reason } = req.body;
    const requestNo = rawRequestNo?.trim();

    if (!requestNo || !firstName || !lastName || !reason) {
      return res.status(400).json({ message: "Entry No, First Name, Last Name, and Reason are required" });
    }

    // 1. Update PurchaseBookEntryModel
    const updatedEntry = await PurchaseBookEntryModel.findOneAndUpdate(
      { entryNo: requestNo },
      { 
        $set: { 
          isRejected: true,
          rejectedByFirst: firstName,
          rejectedByLast: lastName,
          rejectionReason: reason,
          rejectedAt: new Date(),
          status: 'Rejected'
        } 
      },
      { new: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: "Purchase Book entry not found" });
    }

    // 2. Reset JobModel charges (IMPORTANT: removing the link to allow re-submission)
    await JobModel.updateMany(
      { "charges.purchase_book_no": requestNo },
      { 
        $set: { 
          "charges.$[elem].purchase_book_no": "",
          "charges.$[elem].purchase_book_status": "",
          "charges.$[elem].purchase_book_is_approved": false,
          "charges.$[elem].purchase_book_requested_by": ""
        } 
      },
      { 
        arrayFilters: [{ "elem.purchase_book_no": requestNo }] 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "Purchase entry rejected and linked charges reset",
      data: updatedEntry 
    });

  } catch (err) {
    console.error("Error rejecting purchase entry:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/api/update-purchase-utr", async (req, res) => {
  try {
    const { requestNo: rawRequestNo, utrNumber, bankFrom } = req.body;
    const requestNo = rawRequestNo?.trim();
    const username = req.headers.username || "System";

    if (!requestNo || !utrNumber || !bankFrom) {
      return res.status(400).json({ message: "Entry No, UTR Number, and Bank From are required" });
    }

    // 1. Update PurchaseBookEntryModel
    const updatedEntry = await PurchaseBookEntryModel.findOneAndUpdate(
      { entryNo: requestNo },
      { 
        $set: { 
          utrNumber: utrNumber,
          bankFrom: bankFrom,
          utrAddedBy: username,
          utrAddedAt: new Date(),
          paymentReceiptUrl: req.body.paymentReceiptUrl || "",
          status: "Paid"
        } 
      },
      { new: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: "Purchase Book entry not found" });
    }

    // 2. Update JobModel charges status for all matching PB numbers
    await JobModel.updateMany(
      { "charges.purchase_book_no": requestNo },
      { 
        $set: { 
          "charges.$[elem].purchase_book_status": "Paid",
          "charges.$[elem].utrNumber": utrNumber,
          "charges.$[elem].utrAddedBy": username,
          "charges.$[elem].utrAddedAt": new Date(),
          "charges.$[elem].purchase_book_receipt_url": req.body.paymentReceiptUrl || ""
        } 
      },
      { 
        arrayFilters: [{ "elem.purchase_book_no": requestNo }] 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: "UTR/Payment updated and status synced successfully",
      data: updatedEntry 
    });

  } catch (err) {
    console.error("Error updating PB payment details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

import express from "express";
import JobModel from "../../model/jobModel.mjs";
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
    // Add more fields as needed for search!
  ],
});

// Function to calculate color priority for a job
const calculateColorPriority = (job) => {
  const currentDate = new Date();
  
  // Function to calculate the days difference
  const calculateDaysDifference = (targetDate) => {
    const date = new Date(targetDate);
    const timeDifference = date.getTime() - currentDate.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24));
  };

  let highestPriority = 3; // Default: white (lowest priority)

  // Check if the detailed status is "Billing Pending"
  if (job.detailed_status === "Billing Pending" && job.container_nos) {
    job.container_nos.forEach((container) => {
      // Choose the appropriate date based on consignment type
      const targetDate =
        job.consignment_type === "LCL"
          ? container.delivery_date
          : container.emptyContainerOffLoadDate;

      if (targetDate) {
        const daysDifference = calculateDaysDifference(targetDate);

        // Apply colors based on past and current dates only
        if (daysDifference <= -10) {
          highestPriority = Math.min(highestPriority, 1); // Red (highest priority)
        } else if (daysDifference <= -6 && daysDifference >= -9) {
          highestPriority = Math.min(highestPriority, 2); // Orange (medium priority)
        } else if (daysDifference <= 0 && daysDifference >= -5) {
          highestPriority = Math.min(highestPriority, 3); // White (low priority)
        }
      }
    });
  }

  return highestPriority;
};

// Function to sort jobs by color priority (Red > Orange > White)
const sortJobsByColorPriority = (jobs) => {
  return jobs.sort((a, b) => {
    // First, sort by color priority
    const colorPriorityA = calculateColorPriority(a);
    const colorPriorityB = calculateColorPriority(b);
    
    if (colorPriorityA !== colorPriorityB) {
      return colorPriorityA - colorPriorityB; // Lower number = higher priority
    }
    
    // If same color priority, use the existing ranking logic
    const rankA = getJobRank(a);
    const rankB = getJobRank(b);
    
    return rankA - rankB;
  });
};

// Function to get job rank (existing logic)
const getJobRank = (job) => {
  if (job.priorityJob === "High Priority") return 1;
  if (job.priorityJob === "Priority") return 2;
  if (job.detailed_status === "Discharged") return 3;
  if (job.detailed_status === "Gateway IGM Filed") return 4;
  if (job.detailed_status === "Billing Pending") return 5;
  if (job.detailed_status === "Custom Clearance Completed") return 6;
  return 7;
};

router.get("/api/get-billing-import-job", applyUserIcdFilter, async (req, res) => {
  // Extract and decode query parameters
  const { page = 1, limit = 100, search = "", importer, year, unresolvedOnly } = req.query;

  // Decode `importer` (in case it's URL encoded as `%20` for spaces)
  const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";

  // Validate query parameters
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const selectedYear = year ? year.toString() : null; // ✅ Ensure it's a string

  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ message: "Invalid page number" });
  }
  if (isNaN(limitNumber) || limitNumber < 1) {
    return res.status(400).json({ message: "Invalid limit value" });
  }

  try {
    // Calculate pagination skip value
    const skip = (pageNumber - 1) * limitNumber;
    
    // Build the base query with required conditions
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
          ],
        },
      ],
    };

    // ✅ Apply unresolved queries filter if requested
    if (unresolvedOnly === "true") {
      baseQuery.$and.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
      });
    }

    // ✅ Apply Search Filter if Provided
    if (search && search.trim()) {
      baseQuery.$and.push(buildSearchQuery(search.trim()));
    }

    // ✅ Apply Year Filter if Provided
    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear });
    }

    // ✅ Apply Importer Filter (ensure spaces are handled correctly)
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    // Fetch and sort jobs
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob eta bill_document_sent_to_accounts out_of_charge delivery_date detailed_status esanchit_completed_date_time status be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy"
      )
      .sort({ gateway_igm_date: 1 });

    // Custom sorting with color priority
    const rankedJobs = sortJobsByColorPriority(allJobs);

    // Get count of jobs with unresolved queries (for badge)
    const unresolvedQueryBase = { ...baseQuery };
    unresolvedQueryBase.$and = unresolvedQueryBase.$and.filter(condition => 
      !condition.hasOwnProperty('dsr_queries') // Remove the unresolved filter temporarily
    );
    unresolvedQueryBase.$and.push({
      dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
    });
    
    const unresolvedCount = await JobModel.countDocuments(unresolvedQueryBase);
    
    // Pagination
    const totalJobs = rankedJobs.length;
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    // Handle case where no jobs match the query
    if (!paginatedJobs || paginatedJobs.length === 0) {
      return res.status(200).json({
        totalJobs: 0,
        totalPages: 1,
        currentPage: pageNumber,
        jobs: [], // Return an empty array instead of 404
        unresolvedCount
      });
    }
    
    // Send response
    return res.status(200).json({
      totalJobs,
      totalPages: Math.ceil(totalJobs / limitNumber),
      currentPage: pageNumber,
      jobs: paginatedJobs,
      unresolvedCount
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// New API endpoint for jobs with specific detailed_status values
router.get("/api/get-billing-ready-jobs", icdFilter, async (req, res) => {
  // Extract and decode query parameters
  const { page = 1, limit = 100, search = "", importer, year, detailed_status } = req.query;

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

    // Build the base query with detailed_status filter
    const baseQuery = {
      $and: [
        // Apply ICD filtering from middleware
        req.icdFilterCondition
      ],
    };

    // Apply detailed_status filter based on parameter
    if (detailed_status && detailed_status !== "All") {
      baseQuery.$and.push({
        $and: [
          { status: { $regex: /^pending$/i } },
          { detailed_status: detailed_status }
        ]
      });
    } else {
      // Default: show both "Billing Pending" and "Custom Clearance Completed" with pending status
      baseQuery.$and.push({
        $and: [
          { status: { $regex: /^pending$/i } },
          {
            detailed_status: {
              $in: ["Billing Pending", "Custom Clearance Completed"]
            }
          }
        ]
      });
    }

    // ✅ Apply Search Filter if Provided
    if (search && search.trim()) {
      baseQuery.$and.push(buildSearchQuery(search.trim()));
    }

    // ✅ Apply Year Filter if Provided
    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear });
    }

    // ✅ Apply Importer Filter (ensure spaces are handled correctly)
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    // Fetch and sort jobs
    const allJobs = await JobModel.find(baseQuery)
      .select(
        "priorityJob _id eta out_of_charge delivery_date DsrCharges detailed_status esanchit_completed_date_time status be_date be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy billing_completed_date"
      )
      .sort({ gateway_igm_date: 1 });

    // Custom sorting with color priority
    const rankedJobs = sortJobsByColorPriority(allJobs);

    // Pagination
    const totalJobs = rankedJobs.length;
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    // Handle case where no jobs match the query
    if (!paginatedJobs || paginatedJobs.length === 0) {
      return res.status(200).json({
        totalJobs: 0,
        totalPages: 1,
        currentPage: pageNumber,
        jobs: [], // Return an empty array instead of 404
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

// GET /api/get-payment-requested-jobs
router.get("/api/get-payment-requested-jobs", applyUserIcdFilter, async (req, res) => {
  const { page = 1, limit = 100, search = "", importer, year, unresolvedOnly } = req.query;

  // ✅ Debug logging to see what parameters are being received
  console.log("Query parameters received:", req.query);

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

    // Build match conditions with proper ICD filter validation
    const matchConditions = {
      $and: [
        { status: { $regex: /^pending$/i } },
        { "do_shipping_line_invoice.is_payment_requested": true },
      ]
    };

    // ✅ Apply user-based ICD filter from middleware (same as E-Sanchit API)
    if (req.userIcdFilter) {
      matchConditions.$and.push(req.userIcdFilter);
      console.log("Applied userIcdFilter:", req.userIcdFilter);
    } else {
      console.log("No userIcdFilter found in req object");
    }

    if (selectedYear) {
      matchConditions.$and.push({ year: selectedYear });
    }

    // ✅ Apply unresolved queries filter if requested
    if (unresolvedOnly === "true") {
      matchConditions.$and.push({
        dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
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
        ]
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
                            { $not: { $ifNull: ["$$invoice.payment_made_date", false] } }
                          ]
                        }
                      ]
                    }
                  }
                }
              },
              0
            ]
          }
        }
      },
      { $match: { has_pending_payments: true } },
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
          dsr_queries: 1
        }
      },
      { $sort: { gateway_igm_date: 1 } }
    ];

    // ✅ Build separate query for unresolved count to avoid filtering issues
    const unresolvedMatchConditions = {
      $and: [
        { status: { $regex: /^pending$/i } },
        { "do_shipping_line_invoice.is_payment_requested": true },
        { dsr_queries: { $elemMatch: { resolved: { $ne: true } } } }
      ]
    };

    // Add ICD filter for unresolved count (same as main query)
    if (req.userIcdFilter) {
      unresolvedMatchConditions.$and.push(req.userIcdFilter);
    }

    // Add year filter if provided
    if (selectedYear) {
      unresolvedMatchConditions.$and.push({ year: selectedYear });
    }

    // Add importer filter if provided  
    if (decodedImporter && decodedImporter !== "Select Importer") {
      unresolvedMatchConditions.$and.push({
        importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") },
      });
    }

    // Add search filter if provided
    if (search && search.trim()) {
      unresolvedMatchConditions.$and.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { be_no: { $regex: search, $options: "i" } },
          { importer: { $regex: search, $options: "i" } },
        ]
      });
    }
    
    // ✅ Build separate query for unresolved count that matches the main pipeline logic
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
                            { $not: { $ifNull: ["$$invoice.payment_made_date", false] } }
                          ]
                        }
                      ]
                    }
                  }
                }
              },
              0
            ]
          }
        }
      },
      { $match: { has_pending_payments: true } },
      { $count: "total" }
    ];

    const unresolvedResult = await JobModel.aggregate(unresolvedPipeline);
    const unresolvedCount = unresolvedResult.length > 0 ? unresolvedResult[0].total : 0;
    
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
      unresolvedCount
    });
  } catch (err) {
    console.error("Error fetching payment requested jobs:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/get-payment-completed-jobs", applyUserIcdFilter, async (req, res) => {
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
    const skip = (pageNumber - 1) * limitNumber;

    // Build query: status pending and at least one payment requested
    const baseQuery = {
      $and: [
        req.icdFilterCondition,
        { status: { $regex: /^pending$/i } },
        { "do_shipping_line_invoice.is_payment_requested": true },
        { "do_shipping_line_invoice": { $exists: true, $ne: [] } }
      ],
    };

    if (search && search.trim()) {
      baseQuery.$and.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { be_no: { $regex: search, $options: "i" } },
          { importer: { $regex: search, $options: "i" } },
        ]
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
        "priorityJob eta out_of_charge delivery_date DsrCharges detailed_status esanchit_completed_date_time status be_date be_no job_no year importer custom_house gateway_igm_date discharge_date document_entry_completed documentationQueries eSachitQueries documents cth_documents all_documents consignment_type type_of_b_e awb_bl_date awb_bl_no detention_from container_nos ooc_copies icd_cfs_invoice_img shipping_line_invoice_imgs concor_invoice_and_receipt_copy billing_completed_date do_shipping_line_invoice"
      )
      .sort({ gateway_igm_date: 1 });

    // Filter jobs where ALL do_shipping_line_invoice have payment_made_date
    const filteredJobs = allJobsFromDB.filter(job => {
      if (!job.do_shipping_line_invoice || job.do_shipping_line_invoice.length === 0) {
        return false;
      }
      
      // Check if ALL invoices have payment_made_date available
      const allPaymentsMade = job.do_shipping_line_invoice.every(invoice => 
        invoice.payment_made_date && 
        invoice.payment_made_date !== "" && 
        invoice.payment_made_date !== null
      );
      
      return allPaymentsMade;
    });

    // Apply color-based sorting
    const rankedJobs = sortJobsByColorPriority(filteredJobs);
    
    const totalJobs = rankedJobs.length;
    const paginatedJobs = rankedJobs.slice(skip, skip + limitNumber);

    // Add payment status information
    const jobsWithStatus = paginatedJobs.map(job => {
      const jobObj = job.toObject();
      
      // Add payment summary
      jobObj.payment_summary = {
        total_invoices: jobObj.do_shipping_line_invoice?.length || 0,
        payment_requested_count: jobObj.do_shipping_line_invoice?.filter(inv => inv.is_payment_requested).length || 0,
        payment_made_count: jobObj.do_shipping_line_invoice?.filter(inv => 
          inv.payment_made_date && inv.payment_made_date !== ""
        ).length || 0,
        receipt_uploaded_count: jobObj.do_shipping_line_invoice?.filter(inv => 
          inv.payment_recipt && Array.isArray(inv.payment_recipt) && inv.payment_recipt.length > 0
        ).length || 0,
        all_payments_completed: true,
        completion_dates: jobObj.do_shipping_line_invoice?.map(inv => ({
          document_name: inv.document_name,
          payment_made_date: inv.payment_made_date,
          has_receipt: inv.payment_recipt && Array.isArray(inv.payment_recipt) && inv.payment_recipt.length > 0
        }))
      };
      
      return jobObj;
    });

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
});

export default router;
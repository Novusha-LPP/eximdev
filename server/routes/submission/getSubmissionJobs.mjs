import express from "express";
import JobModel from "../../model/jobModel.mjs";
import applyUserIcdFilter from "../../middleware/icdFilter.mjs";

const router = express.Router();

// Function to build the search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { type_of_b_e: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { consignment_type: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
  ],
});

router.get("/api/get-submission-jobs", applyUserIcdFilter, async (req, res) => {
  try {
    // Extract query parameters
    const { page = 1, limit = 10, search = "", importer = "", icd_code = "", year } = req.query;

    // Validate and parse pagination parameters
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

    // Decode and trim filters
    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";
    const decodedICD = icd_code ? decodeURIComponent(icd_code).trim() : "";

    // Build the search query
    const searchQuery = search
      ? {
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
            { awb_bl_no: { $regex: search, $options: "i" } },
            { icd_code: { $regex: search, $options: "i" } }, // 🔍 ICD code search
          ],
        }
      : {};

    // Base conditions that apply to all consignment types
    const baseConditions = [
      { status: { $regex: /^pending$/i } }, // Status is "Pending" (case-insensitive)
      { job_no: { $ne: null } }, // job_no is not null
      {
        $or: [
          { be_no: { $exists: false } }, // be_no does not exist
          { be_no: "" }, // be_no is an empty string
          { submission_completed_date_time: "" }, // be_no is an empty string
        ],
      },
      searchQuery, // Apply search filters
    ];

    // Construct the main query with consignment type specific conditions
    const baseQuery = {
      $and: [
        ...baseConditions,
        {
          $or: [
            // LCL conditions
            {
              $and: [
                { consignment_type: "FCL" },
                { documentation_completed_date_time: { $exists: true, $ne: "" } },
                { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                { discharge_date: { $exists: true, $ne: "" } },
                { gateway_igm_date: { $exists: true, $ne: "" } },
                { gateway_igm: { $exists: true, $ne: "" } },
                { igm_no: { $exists: true, $ne: "" } },
                { igm_date: { $exists: true, $ne: "" } },
                { is_checklist_aprroved: { $exists: true, $ne: false } },
              ],
            },
            // FCL conditions
            {
              $and: [
                { consignment_type: "LCL" },
                { documentation_completed_date_time: { $exists: true, $ne: "" } },
                { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                { is_checklist_aprroved: { $exists: true, $ne: false } },
              ],
            },
          ],
        },
      ],
    };

    // ✅ Apply Year Filter if Provided
    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear }); // Match year as a string
    }

    // ✅ Apply Importer Filter if provided
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({ importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") } });
    }

    // ✅ Apply ICD Code Filter - User-based filtering takes precedence
    if (req.userIcdFilter) {
      // User has specific ICD restrictions
      Object.assign(baseQuery, req.userIcdFilter);
    } else if (decodedICD && decodedICD !== "All ICDs") {
      // Fallback to URL parameter filtering (for backward compatibility)
      baseQuery.$and.push({ icd_code: { $regex: new RegExp(`^${decodedICD}$`, "i") } });
    }
    // If req.userIcdFilter is null, user has full access (admin or "ALL" ICD code)

    // Fetch jobs based on the query
    const jobs = await JobModel.find(baseQuery)
      .select(
        "is_checklist_aprroved_date is_checklist_aprroved submission_completed_date_time be_filing_type priorityJob job_no year type_of_b_e consignment_type custom_house gateway_igm_date gateway_igm igm_no igm_date invoice_number invoice_date awb_bl_no awb_bl_date importer container_nos cth_documents icd_code no_of_pkgs line_no gross_weight job_net_weight do_revalidation"
      )
      .lean();

    // Define priority-based ranking logic
    const priorityRank = (job) => {
      if (job.priorityJob === "High Priority") return 1;
      if (job.priorityJob === "Priority") return 2;
      return 3; // Default rank for jobs without a priority
    };

    // Sort jobs with do_revalidation true at the top, then by priority
    const sortedJobs = jobs.sort((a, b) => {
      // First, sort by do_revalidation (true first)
      const aRevalidation = a.do_revalidation === true ? 0 : 1;
      const bRevalidation = b.do_revalidation === true ? 0 : 1;
      
      if (aRevalidation !== bRevalidation) {
        return aRevalidation - bRevalidation;
      }
      
      // If both have the same revalidation status, sort by priority
      return priorityRank(a) - priorityRank(b);
    });

    // Apply pagination after sorting
    const paginatedJobs = sortedJobs.slice(skip, skip + limitNumber);

    res.status(200).json({
      totalJobs: jobs.length, // Total number of jobs matching the query
      totalPages: Math.ceil(jobs.length / limitNumber), // Total pages based on limit
      currentPage: pageNumber, // Current page
      jobs: paginatedJobs, // Array of jobs for the current page
    });
  } catch (error) {
    console.error("Error fetching submission jobs:", error.stack);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


router.get("/api/get-submission-completed-jobs", applyUserIcdFilter, async (req, res) => {
  try {
    // Extract query parameters
    const { page = 1, limit = 10, search = "", importer = "", icd_code = "", year } = req.query;

    // Validate and parse pagination parameters
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

    // Decode and trim filters
    const decodedImporter = importer ? decodeURIComponent(importer).trim() : "";
    const decodedICD = icd_code ? decodeURIComponent(icd_code).trim() : "";

    // Build the search query
    const searchQuery = search
      ? {
          $or: [
            { job_no: { $regex: search, $options: "i" } },
            { importer: { $regex: search, $options: "i" } },
            { awb_bl_no: { $regex: search, $options: "i" } },
            { icd_code: { $regex: search, $options: "i" } }, // 🔍 ICD code search
            { be_no: { $regex: search, $options: "i" } }, // 🔍 BE number search
          ],
        }
      : {};

// Base conditions that apply to all submission completed jobs
const baseConditions = [
  { job_no: { $ne: null } }, // job_no is not null
  { 
    submission_completed_date_time: { 
      $exists: true, 
      $ne: "", 
      $ne: null,
      $not: { $regex: /^\s*$/ } // Also exclude strings with only whitespace
    } 
  }, // submission_completed_date_time exists and is not empty/null/whitespace
  { 
    be_date: { 
      $exists: true, 
      $ne: "", 
      $ne: null 
    } 
  }, // be_date exists and is not empty/null
  { 
    be_no: { 
      $exists: true, 
      $ne: "", 
      $ne: null 
    } 
  }, // be_no exists and is not empty/null
  searchQuery, // Apply search filters
];

// Alternative approach - more explicit and cleaner
const baseConditionsAlternative = [
  { job_no: { $ne: null } },
  { 
    $and: [
      { submission_completed_date_time: { $exists: true } },
      { submission_completed_date_time: { $ne: null } },
      { submission_completed_date_time: { $ne: "" } },
      { submission_completed_date_time: { $not: { $regex: /^\s*$/ } } }
    ]
  },
  { 
    $and: [
      { be_date: { $exists: true } },
      { be_date: { $ne: null } },
      { be_date: { $ne: "" } }
    ]
  },
  { 
    $and: [
      { be_no: { $exists: true } },
      { be_no: { $ne: null } },
      { be_no: { $ne: "" } }
    ]
  },
  searchQuery,
];

// Most robust approach - using $and array for each field
const baseConditionsRobust = [
  { job_no: { $ne: null } },
  { 
    submission_completed_date_time: {
      $exists: true,
      $nin: [null, "", undefined]  // Not in array of null, empty string, or undefined
    }
  },
  { 
    be_date: {
      $exists: true,
      $nin: [null, "", undefined]
    }
  },
  { 
    be_no: {
      $exists: true,
      $nin: [null, "", undefined]
    }
  },
  searchQuery,
];

// Construct the main query with consignment type specific conditions
const baseQuery = {
  $and: [
    ...baseConditionsRobust, // Use the most robust version
    {
      $or: [
        // LCL conditions
        {
          $and: [
            { consignment_type: "LCL" },
            { documentation_completed_date_time: { $exists: true, $nin: [null, "", undefined] } },
            { esanchit_completed_date_time: { $exists: true, $nin: [null, "", undefined] } },
            { discharge_date: { $exists: true, $nin: [null, "", undefined] } },
            { gateway_igm_date: { $exists: true, $nin: [null, "", undefined] } },
            { gateway_igm: { $exists: true, $nin: [null, "", undefined] } },
            { igm_no: { $exists: true, $nin: [null, "", undefined] } },
            { igm_date: { $exists: true, $nin: [null, "", undefined] } },
            { is_checklist_aprroved: { $exists: true, $ne: false } },
          ],
        },
        // FCL conditions
        {
          $and: [
            { consignment_type: "FCL" },
            { documentation_completed_date_time: { $exists: true, $nin: [null, "", undefined] } },
            { esanchit_completed_date_time: { $exists: true, $nin: [null, "", undefined] } },
            { is_checklist_aprroved: { $exists: true, $ne: false } },
          ],
        },
      ],
    },
  ],
};

    // ✅ Apply Year Filter if Provided
    if (selectedYear) {
      baseQuery.$and.push({ year: selectedYear }); // Match year as a string
    }

    // ✅ Apply Importer Filter if provided
    if (decodedImporter && decodedImporter !== "Select Importer") {
      baseQuery.$and.push({ importer: { $regex: new RegExp(`^${decodedImporter}$`, "i") } });
    }

    // ✅ Apply ICD Code Filter - User-based filtering takes precedence
    if (req.userIcdFilter) {
      // User has specific ICD restrictions
      Object.assign(baseQuery, req.userIcdFilter);
    } else if (decodedICD && decodedICD !== "All ICDs") {
      // Fallback to URL parameter filtering (for backward compatibility)
      baseQuery.$and.push({ icd_code: { $regex: new RegExp(`^${decodedICD}$`, "i") } });
    }
    // If req.userIcdFilter is null, user has full access (admin or "ALL" ICD code)

    // Fetch jobs based on the query
    const jobs = await JobModel.find(baseQuery)
      .select(
        "submission_completed_date_time submission_completed_date_time be_no be_date is_checklist_aprroved_date is_checklist_aprroved be_filing_type priorityJob job_no year type_of_b_e consignment_type custom_house gateway_igm_date gateway_igm igm_no igm_date invoice_number invoice_date awb_bl_no awb_bl_date importer container_nos cth_documents icd_code no_of_pkgs line_no gross_weight job_net_weight do_revalidation"
      )
      .lean();

    // Define priority-based ranking logic
    const priorityRank = (job) => {
      if (job.priorityJob === "High Priority") return 1;
      if (job.priorityJob === "Priority") return 2;
      return 3; // Default rank for jobs without a priority
    };

    // Sort jobs with do_revalidation true at the top, then by priority, then by submission completed date (most recent first)
    const sortedJobs = jobs.sort((a, b) => {
      // First, sort by do_revalidation (true first)
      const aRevalidation = a.do_revalidation === true ? 0 : 1;
      const bRevalidation = b.do_revalidation === true ? 0 : 1;
      
      if (aRevalidation !== bRevalidation) {
        return aRevalidation - bRevalidation;
      }
      
      // If both have the same revalidation status, sort by priority
      const priorityComparison = priorityRank(a) - priorityRank(b);
      if (priorityComparison !== 0) {
        return priorityComparison;
      }
      
      // If priority is the same, sort by submission completed date (most recent first)
      const aDate = new Date(a.submission_completed_date_time);
      const bDate = new Date(b.submission_completed_date_time);
      return bDate - aDate;
    });

    // Apply pagination after sorting
    const paginatedJobs = sortedJobs.slice(skip, skip + limitNumber);

    res.status(200).json({
      totalJobs: jobs.length, // Total number of jobs matching the query
      totalPages: Math.ceil(jobs.length / limitNumber), // Total pages based on limit
      currentPage: pageNumber, // Current page
      jobs: paginatedJobs, // Array of jobs for the current page
    });
  } catch (error) {
    console.error("Error fetching submission completed jobs:", error.stack);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


export default router;

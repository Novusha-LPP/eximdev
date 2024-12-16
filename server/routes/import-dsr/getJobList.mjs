import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

// Status Rank Configuration

const statusRank = {
  "Billing Pending": { rank: 1, field: "delivery_date" },
  "Custom Clearance Completed": { rank: 2, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 3, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 4, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 5, field: "be_date" },
  "Gateway IGM Filed": { rank: 6, field: "gateway_igm_date" },
  Discharged: { rank: 7, field: "discharge_date" },
  "Estimated Time of Arrival": { rank: 8, field: "vessel_berthing" },
};

// Helper to safely parse dates
const parseDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Field selection logic
const defaultFields = `
  job_no year importer custom_house awb_bl_no container_nos vessel_berthing 
  gateway_igm_date discharge_date detailed_status be_no be_date loading_port 
  port_of_reporting type_of_b_e consignment_type shipping_line_airline bill_date out_of_charge delivery_date do_completed do_validity
`;

const additionalFieldsByStatus = {
  be_noted_clearance_pending: "",
  pcv_done_duty_payment_pending: "out_of_charge pcv_date",
  custom_clearance_completed: "out_of_charge",
};

const getSelectedFields = (status) =>
  `${defaultFields} ${additionalFieldsByStatus[status] || ""}`.trim();

// Generate search query
const buildSearchQuery = (search) => ({
  $or: [
    { job_no: { $regex: search, $options: "i" } },
    { type_of_b_e: { $regex: search, $options: "i" } },
    { consignment_type: { $regex: search, $options: "i" } },
    { importer: { $regex: search, $options: "i" } },
    { custom_house: { $regex: search, $options: "i" } },
    { awb_bl_no: { $regex: search, $options: "i" } },
    { vessel_berthing: { $regex: search, $options: "i" } },
    { gateway_igm_date: { $regex: search, $options: "i" } },
    { discharge_date: { $regex: search, $options: "i" } },
    { be_no: { $regex: search, $options: "i" } },
    { be_date: { $regex: search, $options: "i" } },
    { loading_port: { $regex: search, $options: "i" } },
    { port_of_reporting: { $regex: search, $options: "i" } },
    { "container_nos.container_number": { $regex: search, $options: "i" } },
    { "container_nos.arrival_date": { $regex: search, $options: "i" } },
    { "container_nos.detention_from": { $regex: search, $options: "i" } },
  ],
});

// API to fetch jobs with pagination, sorting, and search
router.get("/api/:year/jobs/:status/:detailedStatus", async (req, res) => {
  try {
    const { year, status, detailedStatus } = req.params;
    const { page = 1, limit = 100, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Base query to filter by year
    const query = { year };

    // Handle case-insensitive status filtering and bill_date conditions
    const statusLower = status.toLowerCase();

    if (statusLower === "pending") {
      query.$and = [
        { status: { $regex: "^pending$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $in: [null, ""] } },
            { status: { $regex: "^pending$", $options: "i" } },
          ],
        },
      ];
    } else if (statusLower === "completed") {
      query.$and = [
        { status: { $regex: "^completed$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $nin: [null, ""] } },
            { status: { $regex: "^completed$", $options: "i" } },
          ],
        },
      ];
    } else if (statusLower === "cancelled") {
      query.$and = [
        {
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { be_no: { $regex: "^cancelled$", $options: "i" } },
          ],
        },
      ];
      if (search) query.$and.push(buildSearchQuery(search));
    } else {
      query.$and = [
        { status: { $regex: `^${status}$`, $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
      ];
    }

    // Handle detailedStatus filtering using a mapping object
    const statusMapping = {
      billing_pending: "Billing Pending",
      eta_date_pending: "ETA Date Pending",
      estimated_time_of_arrival: "Estimated Time of Arrival",
      discharged: "Discharged",
      gateway_igm_filed: "Gateway IGM Filed",
      be_noted_arrival_pending: "BE Noted, Arrival Pending",
      be_noted_clearance_pending: "BE Noted, Clearance Pending",
      pcv_done_duty_payment_pending: "PCV Done, Duty Payment Pending",
      custom_clearance_completed: "Custom Clearance Completed",
    };

    if (detailedStatus !== "all") {
      query.detailed_status = statusMapping[detailedStatus] || detailedStatus;
    }

    // Add search filter if provided (for non-cancelled cases)
    if (search && statusLower !== "cancelled") {
      query.$and.push(buildSearchQuery(search));
    }

    // Fetch jobs from the database
    const jobs = await JobModel.find(query).select(
      getSelectedFields(detailedStatus === "all" ? "all" : detailedStatus)
    );

    // Group jobs into ranked and unranked
    const rankedJobs = jobs.filter((job) => statusRank[job.detailed_status]);
    const unrankedJobs = jobs.filter((job) => !statusRank[job.detailed_status]);

    // Sort ranked jobs by status rank and date field
    const sortedRankedJobs = Object.entries(statusRank).reduce(
      (acc, [status, { field }]) => [
        ...acc,
        ...rankedJobs
          .filter((job) => job.detailed_status === status)
          .sort(
            (a, b) =>
              parseDate(a.container_nos?.[0]?.[field] || a[field]) -
              parseDate(b.container_nos?.[0]?.[field] || b[field])
          ),
      ],
      []
    );

    // Combine ranked and unranked jobs
    const allJobs = [...sortedRankedJobs, ...unrankedJobs];

    // Paginate results
    const paginatedJobs = allJobs.slice(skip, skip + parseInt(limit));

    res.json({
      data: paginatedJobs,
      total: allJobs.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(allJobs.length / limit),
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

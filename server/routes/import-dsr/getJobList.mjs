import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { body, param, validationResult } from "express-validator";

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
  port_of_reporting type_of_b_e consignment_type shipping_line_airline bill_date out_of_charge pcv_date delivery_date do_completed do_validity rail_out_date
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

// Status Mapping
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

// Validation Middleware
const validateRequest = [
  param("year")
    .matches(/^\d{2}-\d{2}$/)
    .withMessage("Year must be in the format 'YY-YY'."),
  param("status").isString().withMessage("Status must be a string."),
  param("detailedStatus").isString().withMessage("Detailed Status must be a string."),
  body("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  body("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be a positive integer up to 1000."),
  body("search")
    .optional()
    .isString()
    .trim()
    .escape()
    .withMessage("Search must be a string."),
  body("assigned_importer_name")
    .optional()
    .isArray()
    .withMessage("assigned_importer_name must be an array."),
  body("assigned_importer_name.*")
    .optional()
    .isString()
    .trim()
    .escape()
    .withMessage("Each importer name must be a string."),
];

// API to fetch jobs with pagination, sorting, and search
router.post(
  "/api/:year/jobs/:status/:detailedStatus",
  validateRequest,
  async (req, res) => {
    try {
      // Validate inputs
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { year, status, detailedStatus } = req.params;
      const {
        page = 1,
        limit = 100,
        search = "",
        assigned_importer_name = [],
      } = req.body;

      const skip = (page - 1) * limit;

      // Build initial query with year
      const query = { year }; // Use year as string

      // Apply importer filtering if assigned_importer_name is provided
      if (Array.isArray(assigned_importer_name) && assigned_importer_name.length > 0) {
        query.importer = { $in: assigned_importer_name };
      }

      const statusLower = status.toLowerCase();

      // Apply status-specific conditions
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
      } else {
        query.$and = [
          { status: { $regex: `^${status}$`, $options: "i" } },
          { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        ];
      }

      // Apply detailedStatus if not 'all'
      if (detailedStatus.toLowerCase() !== "all") {
        const mappedStatus = statusMapping[detailedStatus.toLowerCase()] || detailedStatus;
        query.detailed_status = mappedStatus;
      }

      // Apply search if provided
      if (search && statusLower !== "cancelled") {
        query.$and = query.$and || [];
        query.$and.push(buildSearchQuery(search));
      }

      // Define sort criteria based on statusRank
      // Jobs will be sorted first by rank, then by the associated date field
      const sortCriteria = {
        rank: 1, // Ascending order of rank
        // Secondary sort will be handled in the aggregation pipeline
      };

      // Aggregation Pipeline for Sorting
      const aggregationPipeline = [
        { $match: query },
        // Add a 'rank' field based on 'detailed_status'
        {
          $addFields: {
            rank: {
              $switch: {
                branches: Object.entries(statusRank).map(([statusKey, { rank }]) => ({
                  case: { $eq: ["$detailed_status", statusKey] },
                  then: rank,
                })),
                default: Number.MAX_SAFE_INTEGER,
              },
            },
            sortDate: {
              $let: {
                vars: {
                  statusInfo: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: Object.entries(statusRank),
                          as: "statusEntry",
                          cond: { $eq: ["$$statusEntry.0", "$detailed_status"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  $ifNull: [
                    { $arrayElemAt: [`$container_nos.${statusRank[detailedStatus]?.field}`, 0] },
                    `$${statusRank[detailedStatus]?.field}`,
                  ],
                },
              },
            },
          },
        },
        // Sort by rank and sortDate
        { $sort: { rank: 1, sortDate: 1 } },
        // Project the necessary fields
        { $project: { rank: 0, sortDate: 0 } },
        // Pagination
        { $skip: skip },
        { $limit: parseInt(limit, 10) },
      ];

      // Count total documents matching the query
      const total = await JobModel.countDocuments(query);

      // Execute aggregation pipeline
      const jobs = await JobModel.aggregate(aggregationPipeline).exec();

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: jobs,
        total,
        currentPage: parseInt(page, 10),
        totalPages,
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

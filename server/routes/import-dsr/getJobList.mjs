import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { applyUserImporterFilter } from "../../middleware/icdFilter.mjs";
import { determineDetailedStatus } from "../../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../../utils/statusColorMapper.mjs";

const router = express.Router();

// Simple in-memory cache for frequently repeated queries
// Keyed by JSON string of query + page + limit. TTL-based and bounded size.
const simpleCache = new Map();
const CACHE_MAX_ENTRIES = 200; // keep small to avoid memory pressure
const CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutes

const setCache = (key, value) => {
  // Evict oldest if over size
  if (simpleCache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = simpleCache.keys().next().value;
    simpleCache.delete(firstKey);
  }
  simpleCache.set(key, { value, ts: Date.now() });
};

const getCache = (key) => {
  const entry = simpleCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    simpleCache.delete(key);
    return null;
  }
  return entry.value;
};

// Invalidate cache entries for a specific year, or clear all if year is not provided
const invalidateCache = (year = null) => {
  if (year === null) {
    // Clear all cache entries
    simpleCache.clear();
    return;
  }
  // Remove cache entries that match the specified year
  for (const [key, value] of simpleCache.entries()) {
    try {
      const cacheKeyObj = JSON.parse(key);
      if (cacheKeyObj.year === year) {
        simpleCache.delete(key);
      }
    } catch (e) {
      // If key is not valid JSON, skip it
      continue;
    }
  }
};

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

const FAR_FUTURE_DATE = new Date("9999-12-31T23:59:59.999Z");

const buildDateFromField = (fieldPath) => ({
  $dateFromString: {
    dateString: fieldPath,
    onError: null,
    onNull: null,
  },
});

const buildValidDateExpression = (fieldPath) => ({
  $ne: [
    {
      $dateFromString: {
        dateString: fieldPath,
        onError: null,
        onNull: null,
      },
    },
    null,
  ],
});

const buildAnyContainerDateExists = (field) => ({
  $anyElementTrue: {
    $map: {
      input: { $ifNull: ["$container_nos", []] },
      as: "container",
      in: {
        $ne: [
          {
            $dateFromString: {
              dateString: `$$container.${field}`,
              onError: null,
              onNull: null,
            },
          },
          null,
        ],
      },
    },
  },
});

const buildAllContainerDateExists = (field) => ({
  $allElementsTrue: {
    $map: {
      input: { $ifNull: ["$container_nos", []] },
      as: "container",
      in: {
        $ne: [
          {
            $dateFromString: {
              dateString: `$$container.${field}`,
              onError: null,
              onNull: null,
            },
          },
          null,
        ],
      },
    },
  },
});

// Helper to safely parse dates
const parseDate = (dateStr) => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Field selection logic
// PERFORMANCE: Split into critical (list view) and extended (detail view) fields
// Loading only essential fields for the table dramatically improves response time and parsing

const criticalFields = `
  _id job_no cth_no year importer custom_house hawb_hbl_no awb_bl_no 
  container_nos vessel_berthing detailed_status row_color be_no be_date 
  gateway_igm_date discharge_date shipping_line_airline do_doc_recieved_date 
  is_do_doc_recieved obl_recieved_date is_obl_recieved do_copies do_list status
  do_validity do_completed is_og_doc_recieved og_doc_recieved_date
  do_shipping_line_invoice port_of_reporting type_of_b_e consignment_type
  bill_date supplier_exporter cth_documents assessment_date duty_paid_date
  pcv_date out_of_charge free_time
`;

const extensiveFields = `
  loading_port RMS do_validity_upto_job_level 
  bill_amount processed_be_attachment ooc_copies gate_pass_copies fta_Benefit_date_time 
  origin_country hss saller_name adCode by_road_movement_date description 
  invoice_number invoice_date delivery_chalan_file fine_amount penalty_amount 
  penalty_by_us penalty_by_importer other_do_documents intrest_ammount sws_ammount igst_ammount 
  bcd_ammount assessable_ammount emptyContainerOffLoadDate 
  gross_weight job_net_weight payment_method
`;

const additionalFieldsByStatus = {
  be_noted_clearance_pending: "",
  pcv_done_duty_payment_pending: "out_of_charge pcv_date",
  custom_clearance_completed: "out_of_charge",
};

const getSelectedFields = (status, includeExtended = false) => {
  let fields = criticalFields;
  if (includeExtended) {
    fields = `${criticalFields} ${extensiveFields}`;
  }
  fields = `${fields} ${additionalFieldsByStatus[status] || ""}`.trim();
  return fields;
};

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
      const { page = 1, limit = 100, search = "", unresolvedOnly, _nocache } = req.query;
      const searchTerm = String(search || "").trim();
      const bypassCache = _nocache === "true" || _nocache === "1";
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

      const requestedDetailedStatus =
        detailedStatus !== "all"
          ? statusMapping[detailedStatus] || detailedStatus
          : null;

      // Add search filter if provided
      if (searchTerm) {
        query.$and.push(buildSearchQuery(searchTerm));
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

      // Remove sensitive or overly specific parts from cache key
      const cacheKey = JSON.stringify({
        year,
        status,
        detailedStatus,
        selectedICD,
        importer,
        search: searchTerm,
        page,
        limit,
        unresolvedOnly,
        user: req.currentUser?.username || req.headers["x-username"] || null,
      });

      // Return cached response when available (unless bypass is requested)
      if (!bypassCache) {
        const cached = getCache(cacheKey);
        if (cached) {
          return res.json({ ...cached, cached: true });
        }
      }

      // Decide whether to use MongoDB text search (faster for keyword queries)
      const sanitizedSearch = searchTerm;
      const canUseTextSearch =
        sanitizedSearch &&
        sanitizedSearch.length >= 3 &&
        !/[*+?^${}()|[\]\\]/.test(sanitizedSearch) &&
        !/\d/.test(sanitizedSearch);

      // Build aggregation pipeline to get both data and total in single roundtrip
      const matchStage = { $match: query };

      // Build projection object from selected fields
      const selectedFieldsStr = getSelectedFields(detailedStatus === "all" ? "all" : detailedStatus, false);
      const projection = {};
      selectedFieldsStr.split(/\s+/).forEach((f) => {
        if (f) projection[f] = 1;
      });

      const dataPipeline = [];

      // Pre-compute rank and date fields used for sorting (and text score if applicable)
      const statusRankEntries = Object.entries(statusRank);

      const effectiveDetailedStatusExpression = {
        $let: {
          vars: {
            bePresent: {
              $gt: [{ $strLenCP: { $ifNull: ["$be_no", ""] } }, 0],
            },
            anyArrival: buildAnyContainerDateExists("arrival_date"),
            anyRailOut: buildAnyContainerDateExists("container_rail_out_date"),
            allDelivery: buildAllContainerDateExists("delivery_date"),
            allEmptyOffload:
              buildAllContainerDateExists("emptyContainerOffLoadDate"),
            validOutOfCharge: buildValidDateExpression("$out_of_charge"),
            validPcv: buildValidDateExpression("$pcv_date"),
            validDischarge: buildValidDateExpression("$discharge_date"),
            validGateway: buildValidDateExpression("$gateway_igm_date"),
            validVessel: buildValidDateExpression("$vessel_berthing"),
            isExBond: {
              $eq: [
                {
                  $toLower: { $ifNull: ["$type_of_b_e", ""] },
                },
                "ex-bond",
              ],
            },
            isLcl: {
              $eq: [
                {
                  $toLower: { $ifNull: ["$consignment_type", ""] },
                },
                "lcl",
              ],
            },
          },
          in: {
            $let: {
              vars: {
                deliveryOrOffloadSatisfied: {
                  $cond: [
                    { $or: ["$$isExBond", "$$isLcl"] },
                    "$$allDelivery",
                    "$$allEmptyOffload",
                  ],
                },
              },
              in: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $and: [
                          "$$bePresent",
                          "$$anyArrival",
                          "$$validOutOfCharge",
                          "$$deliveryOrOffloadSatisfied",
                        ],
                      },
                      then: "Billing Pending",
                    },
                    {
                      case: {
                        $and: [
                          "$$bePresent",
                          "$$anyArrival",
                          "$$validOutOfCharge",
                        ],
                      },
                      then: "Custom Clearance Completed",
                    },
                    {
                      case: {
                        $and: [
                          "$$bePresent",
                          "$$anyArrival",
                          "$$validPcv",
                        ],
                      },
                      then: "PCV Done, Duty Payment Pending",
                    },
                    {
                      case: {
                        $and: ["$$bePresent", "$$anyArrival"],
                      },
                      then: "BE Noted, Clearance Pending",
                    },
                    {
                      case: {
                        $and: [{ $not: ["$$bePresent"] }, "$$anyArrival"],
                      },
                      then: "Arrived, BE Note Pending",
                    },
                    {
                      case: "$$bePresent",
                      then: "BE Noted, Arrival Pending",
                    },
                    {
                      case: "$$anyRailOut",
                      then: "Rail Out",
                    },
                    {
                      case: "$$validDischarge",
                      then: "Discharged",
                    },
                    {
                      case: "$$validGateway",
                      then: "Gateway IGM Filed",
                    },
                    {
                      case: "$$validVessel",
                      then: "Estimated Time of Arrival",
                    },
                  ],
                  default: "ETA Date Pending",
                },
              },
            },
          },
        },
      };

      const statusRankBranches = statusRankEntries.map(([status, { rank }]) => ({
        case: { $eq: ["$__effective_detailed_status", status] },
        then: rank,
      }));

      const statusDateBranches = statusRankEntries.map(([status, { field }]) => ({
        case: { $eq: ["$__effective_detailed_status", status] },
        then: {
          $ifNull: [
            buildDateFromField(`$container_nos.0.${field}`),
            buildDateFromField(`$${field}`),
          ],
        },
      }));

      const defaultDateExpression = {
        $ifNull: [
          buildDateFromField("$container_nos.0.detention_from"),
          buildDateFromField("$detention_from"),
        ],
      };

      const firstAddFields = {
        __effective_detailed_status: effectiveDetailedStatusExpression,
      };

      if (canUseTextSearch) {
        firstAddFields.score = { $meta: "textScore" };
      }

      const baseAddFields = {
        __status_rank: {
          $switch: {
            branches: statusRankBranches,
            default: 999,
          },
        },
        __status_sort_date: {
          $ifNull: [
            {
              $switch: {
                branches: statusDateBranches,
                default: defaultDateExpression,
              },
            },
            FAR_FUTURE_DATE,
          ],
        },
        __lcl_priority: {
          $cond: [
            {
              $and: [
                { $eq: ["$__effective_detailed_status", "Billing Pending"] },
                {
                  $eq: [
                    {
                      $toLower: {
                        $ifNull: ["$consignment_type", ""],
                      },
                    },
                    "lcl",
                  ],
                },
              ],
            },
            0,
            1,
          ],
        },
      };

      // If text search is allowed use $text and include score
      if (canUseTextSearch) {
        // Use $text search – add $text into match stage
        // We can't modify query object directly when $and is used, so build a match specifically
        const textMatch = Object.assign({}, query);
        // ensure $text is applied at top-level
        textMatch.$text = { $search: sanitizedSearch };

        // Replace matchStage with textMatch
        matchStage.$match = textMatch;
      }

      dataPipeline.push({ $addFields: firstAddFields });
      if (requestedDetailedStatus) {
        dataPipeline.push({
          $match: { __effective_detailed_status: requestedDetailedStatus },
        });
      }
      dataPipeline.push({ $addFields: baseAddFields });
      dataPipeline.push({ $addFields: { detailed_status: "$__effective_detailed_status" } });

      if (canUseTextSearch) {
        dataPipeline.push({
          $sort: {
            score: { $meta: "textScore" },
            __lcl_priority: 1,
            __status_rank: 1,
            __status_sort_date: 1,
            detailed_status: 1,
            _id: 1,
          },
        });
      } else {
        dataPipeline.push({
          $sort: {
            __lcl_priority: 1,
            __status_rank: 1,
            __status_sort_date: 1,
            detailed_status: 1,
            _id: 1,
          },
        });
      }

      // Projection to limit fields
      if (Object.keys(projection).length > 0) {
        dataPipeline.push({ $project: projection });
      }

      const basePipeline = [...dataPipeline];
      const pagedPipeline = [
        ...basePipeline,
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
      ];
      const metadataPipeline = [...basePipeline, { $count: "total" }];

      const pipeline = [
        matchStage,
        {
          $facet: {
            metadata: metadataPipeline,
            data: pagedPipeline,
          },
        },
      ];

      // Execute aggregation
      let jobs = [];
      let totalCount = 0;
      try {
        const aggResult = await JobModel.aggregate(pipeline).allowDiskUse(true).exec();
        const metadata = aggResult[0]?.metadata || [];
        jobs = aggResult[0]?.data || [];
        totalCount = (metadata[0] && metadata[0].total) || 0;
      } catch (aggErr) {
        // If aggregation failed due to sort memory limits on this server/cluster,
        // fall back to a simpler find/count approach (less CPU but avoids large in-memory sort).
        // This is a graceful degradation to keep the UI responsive.
        if (aggErr && aggErr.code === 292) {
          try {
            jobs = await JobModel.find(query).select(projection).skip(parseInt(skip)).limit(parseInt(limit)).lean();
            totalCount = await JobModel.countDocuments(query);
          } catch (fallbackErr) {
            console.error("Aggregation fallback failed:", fallbackErr);
            throw aggErr; // rethrow original aggregation error to be handled below
          }
        } else {
          throw aggErr;
        }
      }

      const responsePayload = {
        data: jobs,
        total: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        userImporters: req.currentUser?.assignedImporterName || [],
      };

      // Cache page 1 results (and any other pages) for short duration (unless bypass was requested)
      if (!bypassCache) {
        try {
          setCache(cacheKey, responsePayload);
        } catch (e) {
          // ignore cache set failures
        }
      }

      res.json(responsePayload);
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

    // Invalidate cache for this job's year to ensure real-time data in editable cells
    if (updatedJob && updatedJob.year) {
      invalidateCache(updatedJob.year);
    } else {
      // Fallback: clear all cache if year is not available
      invalidateCache();
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


// Lightweight typeahead endpoint - returns minimal fields for suggestions
router.get("/api/:year/jobs/typeahead", async (req, res) => {
  try {
    const { year } = req.params;
    const { search = "", limit = 10, selectedICD = "all", importer = "all" } = req.query;
    if (!year) return res.status(400).json({ success: false, message: "year is required" });

    const query = { year };

    if (selectedICD && selectedICD.toLowerCase() !== "all") {
      query.custom_house = { $regex: `^${selectedICD}$`, $options: "i" };
    }

    if (importer && importer.toLowerCase() !== "all") {
      query.importer = { $regex: `^${importer}$`, $options: "i" };
    }

    const safeSearch = String(search || "").trim();
    if (safeSearch.length >= 3) {
      // Detect likely container number patterns (e.g., 4 letters + 7 digits like 'MSKU1234567')
      const isContainerLike = /^[A-Za-z]{2,}\d{3,}$/i.test(safeSearch);
      if (isContainerLike) {
        // Search container numbers explicitly (also allow job_no, awb_bl_no, be_no fallback)
        const regex = new RegExp(safeSearch, "i");
        const results = await JobModel.find({
          ...query,
          $or: [
            { "container_nos.container_number": { $regex: regex } },
            { job_no: { $regex: regex } },
            { awb_bl_no: { $regex: regex } },
            { be_no: { $regex: regex } },
          ],
        })
          .select({ job_no: 1, importer: 1, awb_bl_no: 1, be_no: 1, "container_nos.container_number": 1 })
          .limit(parseInt(limit))
          .lean();
        return res.json({ success: true, data: results });
      }

      // Otherwise try text search if available
      try {
        query.$text = { $search: safeSearch };
        const results = await JobModel.find(query)
          .select({ job_no: 1, importer: 1, awb_bl_no: 1, be_no: 1, score: { $meta: "textScore" } })
          .sort({ score: { $meta: "textScore" } })
          .limit(parseInt(limit))
          .lean();
        return res.json({ success: true, data: results });
      } catch (txtErr) {
        // If text search fails (no text index), fall back to regex OR search including container numbers
        const regex = new RegExp(safeSearch, "i");
        const results = await JobModel.find({
          ...query,
          $or: [
            { job_no: { $regex: regex } },
            { awb_bl_no: { $regex: regex } },
            { be_no: { $regex: regex } },
            { "container_nos.container_number": { $regex: regex } },
          ],
        })
          .select({ job_no: 1, importer: 1, awb_bl_no: 1, be_no: 1, "container_nos.container_number": 1 })
          .limit(parseInt(limit))
          .lean();
        return res.json({ success: true, data: results });
      }
    }

    // Fallback: prefix match on job_no, awb_bl_no or container number
    if (safeSearch.length > 0) {
      const regex = new RegExp(`^${escapeRegex(safeSearch)}`, "i");
      query.$or = [
        { job_no: { $regex: regex } },
        { awb_bl_no: { $regex: regex } },
        { "container_nos.container_number": { $regex: regex } },
      ];
    }

    const results = await JobModel.find(query)
      .select({ job_no: 1, importer: 1, awb_bl_no: 1, be_no: 1, "container_nos.container_number": 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Typeahead error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


export default router;

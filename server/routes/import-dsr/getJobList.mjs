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

// Field selection logic
// PERFORMANCE: Split into critical (list view) and extended (detail view) fields
// Loading only essential fields for the table dramatically improves response time and parsing

const criticalFields = `
  _id job_no cth_no year importer custom_house hawb_hbl_no awb_bl_no 
  container_nos vessel_berthing detailed_status be_no be_date type_of_Do
  gateway_igm_date discharge_date shipping_line_airline do_doc_recieved_date 
  is_do_doc_recieved obl_recieved_date is_obl_recieved do_copies do_list status
  do_validity do_completed is_og_doc_recieved og_doc_recieved_date
  do_shipping_line_invoice port_of_reporting type_of_b_e consignment_type
  bill_date supplier_exporter cth_documents assessment_date duty_paid_date
  pcv_date out_of_charge free_time loading_port RMS do_validity_upto_job_level 
  bill_amount processed_be_attachment ooc_copies gate_pass_copies fta_Benefit_date_time 
  origin_country hss saller_name adCode by_road_movement_date description 
  invoice_number invoice_date delivery_chalan_file fine_amount penalty_amount 
  penalty_by_us penalty_by_importer other_do_documents intrest_ammount sws_ammount igst_ammount 
  bcd_ammount assessable_ammount
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
    fields = `${criticalFields}`;
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
      const {
        page = 1,
        limit = 100,
        search = "",
        unresolvedOnly,
        _nocache,
      } = req.query;

      const searchTerm = String(search || "").trim();
      const bypassCache = _nocache === "true" || _nocache === "1";
      const skip = (page - 1) * limit;

      const query = { year };

      const escapeRegex = (string) =>
        string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

      if (!query.$and) query.$and = [];

      // 1) User-based importer filter
      if (req.userImporterFilter) {
        query.$and.push(req.userImporterFilter);
      }

      // 2) Additional importer filter from URL
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
        const userImporters = req.currentUser?.assignedImporterName || [];
        const isImporterAllowed = userImporters.some(
          (userImp) => userImp.toLowerCase() === importer.toLowerCase()
        );

        if (isImporterAllowed) {
          query.$and = query.$and.filter((condition) => !condition.importer);
          query.importer = {
            $regex: `^${escapeRegex(importer)}$`,
            $options: "i",
          };
        }
      }

      // 3) ICD filtering
      if (selectedICD && selectedICD.toLowerCase() !== "all") {
        query.custom_house = {
          $regex: `^${escapeRegex(selectedICD)}$`,
          $options: "i",
        };
      }

      // 4) Status filtering
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

      // 5) detailedStatus mapping
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

      // 6) Search filter (regex-based)
      if (searchTerm) {
        query.$and.push(buildSearchQuery(searchTerm));
      }

      // 7) unresolvedOnly filter
      if (unresolvedOnly === "true") {
        query.$and.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      if (query.$and && query.$and.length === 0) {
        delete query.$and;
      }

      // 8) Cache key
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

      if (!bypassCache) {
        const cached = getCache(cacheKey);
        if (cached) {
          return res.json({ ...cached, cached: true });
        }
      }

      const matchStage = { $match: query };

      // 10) Projection from selected fields (early to reduce size)
      const selectedFieldsStr = getSelectedFields(
        detailedStatus === "all" ? "all" : detailedStatus,
        false
      );
      const projection = {};
      selectedFieldsStr.split(/\s+/).forEach((f) => {
        if (f) projection[f] = 1;
      });

      // Always keep fields needed for status calculation
      projection.be_no = 1;
      projection.type_of_b_e = 1;
      projection.consignment_type = 1;
      projection.out_of_charge = 1;
      projection.pcv_date = 1;
      projection.discharge_date = 1;
      projection.gateway_igm_date = 1;
      projection.vessel_berthing = 1;
      projection.container_nos = 1;

      const preProjectStage = { $project: projection };

      // 11) Effective detailed_status expression
      const effectiveDetailedStatusExpression = {
        $let: {
          vars: {
            bePresent: {
              $gt: [{ $strLenCP: { $ifNull: ["$be_no", ""] } }, 0],
            },
            anyArrival: buildAnyContainerDateExists("arrival_date"),
            anyRailOut: buildAnyContainerDateExists("container_rail_out_date"),
            allDelivery: buildAllContainerDateExists("delivery_date"),
            allEmptyOffload: buildAllContainerDateExists(
              "emptyContainerOffLoadDate"
            ),
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
            $cond: [
              "$$isExBond",
              // Ex-Bond flow
              {
                $switch: {
                  branches: [
                    {
                      case: {
                        $and: [
                          "$$bePresent",
                          "$$validOutOfCharge",
                          "$$allDelivery",
                        ],
                      },
                      then: "Billing Pending",
                    },
                    {
                      case: {
                        $and: ["$$bePresent", "$$validOutOfCharge"],
                      },
                      then: "Custom Clearance Completed",
                    },
                    {
                      case: {
                        $and: ["$$bePresent", "$$validPcv"],
                      },
                      then: "PCV Done, Duty Payment Pending",
                    },
                  ],
                  default: "ETA Date Pending",
                },
              },
              // Non Ex-Bond flow
              {
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
                            $and: ["$$bePresent", "$$anyArrival", "$$validPcv"],
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
            ],
          },
        },
      };

      const statusRankEntries = Object.entries(statusRank);

      const statusRankBranches = statusRankEntries.map(
        ([status, { rank }]) => ({
          case: { $eq: ["$__effective_detailed_status", status] },
          then: rank,
        })
      );

      const statusDateBranches = statusRankEntries.map(
        ([status, { field }]) => ({
          case: { $eq: ["$__effective_detailed_status", status] },
          then: {
            $ifNull: [
              buildDateFromField(`$container_nos.0.${field}`),
              buildDateFromField(`$${field}`),
            ],
          },
        })
      );

      const defaultDateExpression = {
        $ifNull: [
          buildDateFromField("$container_nos.0.detention_from"),
          buildDateFromField("$detention_from"),
        ],
      };

      const firstAddFields = {
        __effective_detailed_status: effectiveDetailedStatusExpression,
      };

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
      };

const dataPipeline = [];

// 1) compute effective detailed status
dataPipeline.push({ $addFields: firstAddFields });

dataPipeline.push({
  $match: {
    $expr: {
      $cond: [
        { $eq: ["$status", "Pending"] },  // IF status == Pending
        { $ne: ["$__effective_detailed_status", "Billing Pending"] }, // THEN exclude Billing Pending
        true // ELSE allow all
      ]
    }
  }
});


// 3) if you also filter by requestedDetailedStatus, do it here
if (requestedDetailedStatus) {
  dataPipeline.push({
    $match: { __effective_detailed_status: requestedDetailedStatus },
  });
}

// 4) add rank/sort helpers
dataPipeline.push({ $addFields: baseAddFields });

// 5) expose effective status as detailed_status
dataPipeline.push({
  $addFields: {
    detailed_status: "$__effective_detailed_status",
  },
});

      // Sort without textScore
      const sortStage = {
        $sort: {
          __status_rank: 1,
          __status_sort_date: 1,
          _id: 1,
        },
      };

      const basePipeline = [...dataPipeline];

      const pagedPipeline = [
        ...basePipeline,
        sortStage,
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
      ];

      // metadata: no sort, just count
      const metadataPipeline = [...basePipeline, { $count: "total" }];

      const pipeline = [
        matchStage,
        preProjectStage,
        {
          $facet: {
            metadata: metadataPipeline,
            data: pagedPipeline,
          },
        },
      ];

      const aggResult = await JobModel.aggregate(pipeline)
        .allowDiskUse(true)
        .exec();

      const metadata = aggResult[0]?.metadata || [];
      const jobs = aggResult[0]?.data || [];
      const totalCount = (metadata[0] && metadata[0].total) || 0;

      const responsePayload = {
        data: jobs,
        total: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        userImporters: req.currentUser?.assignedImporterName || [],
      };

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
    // After passing the length guard:
    const existing = await JobModel.findById(id).lean();
    if (!existing)
      return res.status(404).json({ success: false, message: "Job not found" });

    const merged = { ...existing, ...updateData };
    if (existing.container_nos && updateData.container_nos) {
      merged.container_nos = updateData.container_nos; // or deeply merge as needed
    }

    const recomputedStatus = determineDetailedStatus(merged);
    const rowColor = getRowColorFromStatus(
      recomputedStatus || existing.detailed_status
    );

    const finalDoc = await JobModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updateData,
          detailed_status: recomputedStatus,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (finalDoc?.year) invalidateCache(finalDoc.year);
    else invalidateCache();

    return res
      .status(200)
      .json({
        success: true,
        message: "Job updated successfully",
        data: finalDoc,
      });
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
// API: ONLY jobs whose stored detailed_status is exactly "Billing Pending"
router.get(
  "/api/:year/jobs-billing-pending/:selectedICD/:importer",
  applyUserImporterFilter,
  async (req, res) => {
    try {
      const { year, importer, selectedICD } = req.params;
      const {
        page = 1,
        limit = 100,
        search = "",
        unresolvedOnly,
      } = req.query;

      const searchTerm = String(search || "").trim();
      const skip = (page - 1) * limit;

      // ---- base find query on the collection (no aggregation filters here) ----
      const findQuery = { year };

      const escapeRegex = (string) =>
        string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

      if (!findQuery.$and) findQuery.$and = [];

      // user-based importer filter
      if (req.userImporterFilter) {
        findQuery.$and.push(req.userImporterFilter);
      }

      // importer from URL
      if (
        importer &&
        importer.toLowerCase() !== "all" &&
        !req.userImporterFilter
      ) {
        findQuery.importer = {
          $regex: `^${escapeRegex(importer)}$`,
          $options: "i",
        };
      } else if (
        importer &&
        importer.toLowerCase() !== "all" &&
        req.userImporterFilter
      ) {
        const userImporters = req.currentUser?.assignedImporterName || [];
        const isImporterAllowed = userImporters.some(
          (userImp) => userImp.toLowerCase() === importer.toLowerCase()
        );

        if (isImporterAllowed) {
          findQuery.$and = findQuery.$and.filter(
            (condition) => !condition.importer
          );
          findQuery.importer = {
            $regex: `^${escapeRegex(importer)}$`,
            $options: "i",
          };
        }
      }

      // ICD
      if (selectedICD && selectedICD.toLowerCase() !== "all") {
        findQuery.custom_house = {
          $regex: `^${escapeRegex(selectedICD)}$`,
          $options: "i",
        };
      }

      // unresolvedOnly
      if (unresolvedOnly === "true") {
        findQuery.$and.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      // search
      if (searchTerm) {
        findQuery.$and.push(buildSearchQuery(searchTerm));
      }

      if (findQuery.$and && findQuery.$and.length === 0) {
        delete findQuery.$and;
      }

      // ------------------------ aggregation pipeline ------------------------
      const projection = {};
      const selectedFieldsStr = getSelectedFields("all", false);
      selectedFieldsStr.split(/\s+/).forEach((f) => {
        if (f) projection[f] = 1;
      });

      // keep fields needed for status computation
      projection.be_no = 1;
      projection.type_of_b_e = 1;
      projection.consignment_type = 1;
      projection.out_of_charge = 1;
      projection.pcv_date = 1;
      projection.discharge_date = 1;
      projection.gateway_igm_date = 1;
      projection.vessel_berthing = 1;
      projection.container_nos = 1;

      const preProjectStage = { $project: projection };

      // effective detailed_status expression (same as main API)
      const effectiveDetailedStatusExpression = { /* your big $let expression here, unchanged */ };

      const statusRankEntries = Object.entries(statusRank);

      const statusRankBranches = statusRankEntries.map(
        ([status, { rank }]) => ({
          case: { $eq: ["$__effective_detailed_status", status] },
          then: rank,
        })
      );

      const statusDateBranches = statusRankEntries.map(
        ([status, { field }]) => ({
          case: { $eq: ["$__effective_detailed_status", status] },
          then: {
            $ifNull: [
              buildDateFromField(`$container_nos.0.${field}`),
              buildDateFromField(`$${field}`),
            ],
          },
        })
      );

      const defaultDateExpression = {
        $ifNull: [
          buildDateFromField("$container_nos.0.detention_from"),
          buildDateFromField("$detention_from"),
        ],
      };

      const firstAddFields = {
        __effective_detailed_status: effectiveDetailedStatusExpression,
      };

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
      };

      const dataPipeline = [];

      // only stored Billing Pending docs
      dataPipeline.push({
        $match: {
          status: "Pending",
          detailed_status: "Billing Pending",
        },
      });

      // compute effective status
      dataPipeline.push({ $addFields: firstAddFields });

      // add rank/sort helpers
      dataPipeline.push({ $addFields: baseAddFields });

      // optional: override detailed_status with computed one
      dataPipeline.push({
        $addFields: {
          detailed_status: "$__effective_detailed_status",
        },
      });

      const sortStage = {
        $sort: {
          __status_rank: 1,
          __status_sort_date: 1,
          _id: 1,
        },
      };

      const basePipeline = [
        { $match: findQuery }, // filters from URL
        preProjectStage,
        ...dataPipeline,
      ];

      const pagedPipeline = [
        ...basePipeline,
        sortStage,
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
      ];

      const metadataPipeline = [...basePipeline, { $count: "total" }];

      const pipeline = [
        {
          $facet: {
            metadata: metadataPipeline,
            data: pagedPipeline,
          },
        },
      ];

      const aggResult = await JobModel.aggregate(pipeline)
        .allowDiskUse(true)
        .exec();

      const metadata = aggResult[0]?.metadata || [];
      const jobs = aggResult[0]?.data || [];
      const totalCount = (metadata[0] && metadata[0].total) || 0;

      const responsePayload = {
        data: jobs,
        total: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        userImporters: req.currentUser?.assignedImporterName || [],
      };

      res.json(responsePayload);
    } catch (error) {
      console.error("Error fetching Billing Pending jobs:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


export default router;

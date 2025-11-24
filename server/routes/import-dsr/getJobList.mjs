import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { applyUserImporterFilter } from "../../middleware/icdFilter.mjs";
import { determineDetailedStatus } from "../../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../../utils/statusColorMapper.mjs";

const router = express.Router();

// ---------------- CACHE ----------------

const simpleCache = new Map();
const CACHE_MAX_ENTRIES = 200;
const CACHE_TTL_MS = 1000 * 60 * 2;

const setCache = (key, value) => {
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

const invalidateCache = (year = null) => {
  if (year === null) {
    simpleCache.clear();
    return;
  }
  for (const [key] of simpleCache.entries()) {
    try {
      const cacheKeyObj = JSON.parse(key);
      if (cacheKeyObj.year === year) {
        simpleCache.delete(key);
      }
    } catch {
      continue;
    }
  }
};

// ---------------- STATUS RANK ----------------

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

// ---------------- AGG HELPERS ----------------

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

// ---------------- FIELD SELECTION ----------------

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

// ---------------- SEARCH HELPER ----------------

const escapeRegex = (string) =>
  string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

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

// ---------------- LIST API (unchanged) ----------------

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
      if (!query.$and) query.$and = [];

      // 1) user importer filter
      if (req.userImporterFilter) {
        query.$and.push(req.userImporterFilter);
      }

      // 2) importer from URL
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

      // 3) ICD
      if (selectedICD && selectedICD.toLowerCase() !== "all") {
        query.custom_house = {
          $regex: `^${escapeRegex(selectedICD)}$`,
          $options: "i",
        };
      }

      // 4) status
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

      // 5) detailed status mapping
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

      // 6) search
      if (searchTerm) {
        query.$and.push(buildSearchQuery(searchTerm));
      }

      // 7) unresolvedOnly
      if (unresolvedOnly === "true") {
        query.$and.push({
          dsr_queries: { $elemMatch: { resolved: { $ne: true } } },
        });
      }

      if (query.$and && query.$and.length === 0) {
        delete query.$and;
      }

      // 8) cache key
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

      // 10) projection
      const selectedFieldsStr = getSelectedFields(
        detailedStatus === "all" ? "all" : detailedStatus,
        false
      );
      const projection = {};
      selectedFieldsStr.split(/\s+/).forEach((f) => {
        if (f) projection[f] = 1;
      });

      // always keep fields needed for status
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

      // 11) effective detailed_status
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
              {
                // Ex-bond
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
              {
                // Non Ex-bond
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
            ],
          },
        },
      };

      const statusRankEntries = Object.entries(statusRank);

      const statusRankBranches = statusRankEntries.map(
        ([statusName, { rank }]) => ({
          case: { $eq: ["$__effective_detailed_status", statusName] },
          then: rank,
        })
      );

      const statusDateBranches = statusRankEntries.map(
        ([statusName, { field }]) => ({
          case: { $eq: ["$__effective_detailed_status", statusName] },
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

      dataPipeline.push({ $addFields: firstAddFields });

      if (requestedDetailedStatus) {
        dataPipeline.push({
          $match: { __effective_detailed_status: requestedDetailedStatus },
        });
      }

      dataPipeline.push({ $addFields: baseAddFields });

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

      const basePipeline = [...dataPipeline];

      const pagedPipeline = [
        ...basePipeline,
        sortStage,
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
      ];

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
        } catch {
          // ignore cache errors
        }
      }

      res.json(responsePayload);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ---------------- PATCH API (fixed merge) ----------------

const applyDotNotationToMerged = (merged, updateData) => {
  for (const [key, value] of Object.entries(updateData)) {
    if (key.includes(".")) {
      const parts = key.split(".");
      if (parts[0] === "container_nos") {
        const idx = parseInt(parts[1], 10);
        const field = parts[2];
        if (
          !Number.isNaN(idx) &&
          merged.container_nos &&
          merged.container_nos[idx]
        ) {
          merged.container_nos[idx] = {
            ...merged.container_nos[idx],
            [field]: value,
          };
        }
      } else {
        // other dot paths if needed in future
      }
    } else if (!key.startsWith("__")) {
      merged[key] = value;
    }
  }
  return merged;
};

router.patch("/api/jobs/:id", auditMiddleware("Job"), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // guard full container_nos replacement
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

    const existing = await JobModel.findById(id).lean();
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Job not found" });
    }

    let merged = { ...existing };

    // apply dot-notation changes into merged
    merged = applyDotNotationToMerged(merged, updateData);

    // if full container_nos array sent, override
    if (existing.container_nos && updateData.container_nos) {
      merged.container_nos = updateData.container_nos;
    }

    const recomputedStatus = determineDetailedStatus(merged);
    const rowColor = getRowColorFromStatus(recomputedStatus);

    const finalDoc = await JobModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updateData,
          detailed_status: recomputedStatus,
          row_color: rowColor,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (finalDoc?.year) invalidateCache(finalDoc.year);
    else invalidateCache();

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: finalDoc,
    });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ---------------- SINGLE JOB FETCH ----------------

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

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error fetching job for delivery note:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;

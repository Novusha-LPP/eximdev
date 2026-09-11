import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { applyUserImporterFilter } from "../../middleware/icdFilter.mjs";
import { determineDetailedStatus } from "../../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../../utils/statusColorMapper.mjs";
import mongoose from "mongoose";
import { getBranchMatch } from "../../utils/branchFilter.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { applyUserBranchFilter } from "../../middleware/branchMiddleware.mjs";
import { recalculateLicenseUtilizationForJob, validateLicenseUtilization, getUsdImportRate } from "../../services/licenseUtilizationService.mjs";
import { validateRodtepUtilization } from "../../services/rodtepService.mjs";
import ClientQuery from "../../model/clientQueryModel.mjs";
import { invalidateJobTabCountsCache } from "./getJobTabCounts.mjs";

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
  "Billed": { rank: 0, field: "billing_completed_date" },
  "Billing Pending": { rank: 1, field: "emptyContainerOffLoadDate" },
  "Do completed and Delivery pending": { rank: 2, field: "do_completed" },
  "Custom Clearance Completed": { rank: 3, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 4, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 5, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 6, field: "be_date" },
  "Arrived, BE Note Pending": { rank: 7, field: "be_date" },
  "Rail Out": { rank: 8, field: "rail_out" },
  Discharged: { rank: 9, field: "discharge_date" },
  "Gateway IGM Filed": { rank: 10, field: "gateway_igm_date" },
  "Estimated Time of Arrival": { rank: 11, field: "vessel_berthing" },
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
  _id job_no job_number branch_id branch_code trade_type mode ie_code_no cth_no year importer custom_house importer_reference_no hawb_hbl_no awb_bl_no 
  container_nos vessel_berthing etd etd_date etdDate detailed_status be_no be_date type_of_Do billing_completed_date
  gateway_igm gateway_igm_date igm_date igm_no discharge_date shipping_line_airline do_doc_recieved_date 
  is_do_doc_recieved obl_recieved_date is_obl_recieved do_copies do_list status
  do_validity do_completed is_og_doc_recieved og_doc_recieved_date
  do_shipping_line_invoice port_of_reporting type_of_b_e consignment_type
  bill_date supplier_exporter cth_documents assessment_date duty_paid_date
  pcv_date out_of_charge free_time loading_port RMS do_validity_upto_job_level 
  bill_amount processed_be_attachment ooc_copies gate_pass_copies fta_Benefit_date_time 
  origin_country hss saller_name adCode by_road_movement_date description 
  hss_address hss_address_details hss_branch_id hss_city hss_ie_code_no hss_postal_code hss_country hss_ad_code
  invoice_number invoice_date delivery_chalan_file fine_amount penalty_amount 
  penalty_by_us penalty_by_importer other_do_documents intrest_ammount sws_ammount igst_ammount 
  bcd_ammount assessable_ammount total_inv_value product_value freight insurance other_charges inv_currency detention_from 
  gross_weight job_net_weight payment_method no_of_pkgs delivery_completed_date job_date
  shipping_line_invoice_imgs obl_telex_bl document_received_date
  concor_invoice_and_receipt_copy thar_invoices hasti_invoices icd_cfs_invoice_img cfs_name charges
  invoice_details description_details
  checklist is_checklist_aprroved is_checklist_clicked is_checklist_aprroved_date remark_client
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

const buildSearchQuery = (search) => {
  const cleanSearch = String(search || "").trim();
  const isHssQuery = cleanSearch.toLowerCase() === "hss";

  const conditions = [
    { job_no: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { job_number: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { type_of_b_e: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { supplier_exporter: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { consignment_type: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { importer: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { selectedICD: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { custom_house: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { awb_bl_no: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { vessel_berthing: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { gateway_igm_date: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { discharge_date: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { be_no: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { be_date: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { loading_port: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { port_of_reporting: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    { hawb_hbl_no: { $regex: escapeRegex(cleanSearch), $options: "i" } },
    {
      "container_nos.container_number": {
        $regex: escapeRegex(cleanSearch),
        $options: "i",
      },
    },
    {
      "container_nos.arrival_date": {
        $regex: escapeRegex(cleanSearch),
        $options: "i",
      },
    },
    {
      "container_nos.detention_from": {
        $regex: escapeRegex(cleanSearch),
        $options: "i",
      },
    },
  ];

  if (isHssQuery) {
    conditions.push({ hss: { $regex: "^yes$", $options: "i" } });
  }

  return { $or: conditions };
};

// ---------------- LIST API (unchanged) ----------------

router.get(
  "/api/:year/jobs/:status/:detailedStatus/:selectedICD/:importer",
  authMiddleware,
  applyUserBranchFilter,
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
        branchId,
        category,
        tradeType,
        mode,
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
        query.importer = new RegExp(`^${escapeRegex(importer.trim())}$`, "i");
      } else if (
        importer &&
        importer.toLowerCase() !== "all" &&
        req.userImporterFilter
      ) {
        const userImporters = req.currentUser?.assignedImporterName || [];
        const isImporterAllowed = userImporters.some(
          (userImp) => (userImp || "").trim().toLowerCase() === importer.trim().toLowerCase()
        );
        if (isImporterAllowed) {
          query.$and = query.$and.filter((condition) => !condition.importer);
          query.importer = new RegExp(`^${escapeRegex(importer.trim())}$`, "i");
        } else {
          query.importer = { $in: [] };
        }
      }

      // 3) ICD
      if (selectedICD && selectedICD.toLowerCase() !== "all") {
        query.custom_house = { $in: [selectedICD, selectedICD.trim()] };
      }

      // 3.5) Type of BE
      const { typeOfBe } = req.query;
      if (typeOfBe && typeOfBe.toLowerCase() !== "all") {
        query.type_of_b_e = { $in: [typeOfBe, typeOfBe.trim()] };
      }

      // 3.6) Branch, Trade Type, Mode
      const branchMatch = getBranchMatch(branchId, category, req.authorizedBranchIds);
      Object.assign(query, branchMatch);

      if (tradeType && tradeType.toLowerCase() !== "all") {
        query.trade_type = tradeType.toUpperCase();
      }
      if (mode && mode.toLowerCase() !== "all") {
        query.mode = mode.toUpperCase();
      }

      // 4) status
      const statusLower = status.toLowerCase();

      if (statusLower === "pending") {
        query.$and.push(
          { status: { $in: ["pending", "Pending", "PENDING"] } },
          { be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } },
          {
            $or: [
              { bill_date: { $in: [null, ""] } },
              { status: { $in: ["pending", "Pending", "PENDING"] } },
              { dsr_queries: { $elemMatch: { select_module: "DSR", resolved: { $ne: true } } } },
            ],
          }
        );
      } else if (statusLower === "completed") {
        query.$and.push(
          { status: { $in: ["completed", "Completed", "COMPLETED"] } },
          { be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } },
          {
            $or: [
              { bill_date: { $nin: [null, ""] } },
              { status: { $in: ["completed", "Completed", "COMPLETED"] } },
            ],
          }
        );
      } else if (statusLower === "cancelled") {
        query.$and.push({
          $or: [
            { status: { $in: ["cancelled", "Cancelled", "CANCELLED"] } },
            { be_no: { $in: ["cancelled", "Cancelled", "CANCELLED"] } },
          ],
        });
      } else if (statusLower === "billing_confirmation") {
        query.$and.push(
          { bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] } },
          {
            $or: [
              { billing_confirmation_date: { $exists: false } },
              { billing_confirmation_date: null },
              { billing_confirmation_date: "" }
            ]
          },
          {
            $or: [
              { billing_completed_date: { $exists: false } },
              { billing_completed_date: null },
              { billing_completed_date: "" }
            ]
          },
          { be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } },
          { status: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } }
        );
      } else {
        query.$and.push(
          { status: { $in: [status, status.toLowerCase(), status.toUpperCase()] } },
          { be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } }
        );
      }

      // 5) detailed status mapping
      const statusMapping = {
        billed: "Billed",
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

      if (requestedDetailedStatus) {
        query.detailed_status = {
          $in: [
            requestedDetailedStatus,
            requestedDetailedStatus.toLowerCase(),
            requestedDetailedStatus.toUpperCase(),
          ],
        };
      }

      // 6) search
      if (searchTerm) {
        query.$and = query.$and || [];
        query.$and.push(buildSearchQuery(searchTerm));
      }

      // 7) unresolvedOnly
      if (unresolvedOnly === "true") {
        const openQueryJobNos = await ClientQuery.distinct("job_no", {
          module_type: "import",
          $or: [{ status: "open" }, { seenByAdmin: false }],
        });
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { dsr_queries: { $elemMatch: { select_module: "DSR", resolved: { $ne: true } } } },
            { job_no: { $in: openQueryJobNos } },
          ],
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
        typeOfBe,
        search: searchTerm,
        page,
        limit,
        unresolvedOnly,
        branchId,
        tradeType,
        mode,
        user: req.currentUser?.username || req.headers["x-username"] || null,
      });

      if (!bypassCache) {
        const cached = getCache(cacheKey);
        if (cached) {
          return res.json({ ...cached, cached: true });
        }
      }

      // 9) projection
      const selectedFieldsStr = getSelectedFields(
        detailedStatus === "all" ? "all" : detailedStatus,
        false
      );

      // 10) Fast indexed parallel count + find
      let findQuery = JobModel.find(query)
        .select(selectedFieldsStr + " row_color status_rank status_sort_date detailed_status")
        .sort({ status_rank: 1, status_sort_date: 1, _id: 1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();

      // Use index hint on broad status queries without selective filters to avoid heavy in-memory sort
      if (
        !search &&
        (!detailedStatus || detailedStatus === "all") &&
        (!importer || importer.toLowerCase() === "all") &&
        (!selectedICD || selectedICD === "all")
      ) {
        findQuery = findQuery.hint("year_1_status_rank_1_status_sort_date_1");
      }

      const [totalCount, jobs] = await Promise.all([
        JobModel.countDocuments(query),
        findQuery,
      ]);

      // Ensure detailed_status and row_color are set consistently
      jobs.forEach((job) => {
        if (!job.detailed_status) {
          job.detailed_status = "ETA Date Pending";
        }
        if (!job.row_color) {
          job.row_color = getRowColorFromStatus(job.detailed_status);
        }
      });

      // 11) Calculate unresolvedCount for Pending status without extra client request
      let unresolvedCount = 0;
      if (statusLower === "pending") {
        try {
          const openQueryJobNos = await ClientQuery.distinct("job_no", {
            module_type: "import",
            $or: [{ status: "open" }, { seenByAdmin: false }],
          });
          const unresCond = [
            { dsr_queries: { $elemMatch: { select_module: "DSR", resolved: { $ne: true } } } },
            { job_no: { $in: openQueryJobNos } },
          ];
          const unresQuery = { ...query };
          if (unresQuery.$and) {
            unresQuery.$and = [...unresQuery.$and, { $or: unresCond }];
          } else {
            unresQuery.$or = unresCond;
          }
          unresolvedCount = await JobModel.countDocuments(unresQuery);
        } catch (e) {
          console.error("Error calculating unresolvedCount:", e);
        }
      }

      const responsePayload = {
        data: jobs,
        total: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        userImporters: req.currentUser?.assignedImporterName || [],
        unresolvedCount,
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
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Sync gross_weight or unit updates to the first description detail row
    if (updateData.gross_weight !== undefined || updateData.unit !== undefined) {
      const gWt = updateData.gross_weight !== undefined ? updateData.gross_weight : existing.gross_weight;
      const uqcVal = updateData.unit !== undefined ? updateData.unit : existing.unit;
      
      if (gWt !== undefined || uqcVal !== undefined) {
        let descDetails = existing.description_details || [];
        if (descDetails.length === 0) {
          descDetails = [{
            quantity: gWt || "",
            unit: uqcVal || "",
            description: existing.description || ""
          }];
        } else {
          descDetails = [...descDetails];
          descDetails[0] = {
            ...descDetails[0]
          };
          if (gWt !== undefined) descDetails[0].quantity = String(gWt);
          if (uqcVal !== undefined) descDetails[0].unit = String(uqcVal);
        }
        updateData.description_details = descDetails;
      }
    }

    // ✅ Validate license utilization limits & check for duplicates before saving
    if (updateData.description_details) {
      const usdRate = await getUsdImportRate();
      try {
        await validateLicenseUtilization(
          updateData.description_details,
          id,
          updateData.exrate || existing.exrate || 84,
          usdRate,
          updateData.be_no || existing.be_no || "",
          existing.job_no || existing.job_number || ""
        );
        await validateRodtepUtilization(
          updateData.description_details,
          id,
          updateData.exrate || existing.exrate || 84
        );
      } catch (validationErr) {
        return res.status(400).json({ success: false, message: validationErr.message });
      }
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

    const updateSet = {
      ...updateData,
      detailed_status: recomputedStatus,
      row_color: rowColor,
    };

    if (recomputedStatus === "Billed") {
      updateSet.status = "Completed";
    }

    const finalDoc = await JobModel.findByIdAndUpdate(
      id,
      {
        $set: updateSet,
      },
      { new: true, runValidators: true }
    ).lean();

    if (finalDoc?.year) invalidateCache(finalDoc.year);
    else invalidateCache();
    invalidateJobTabCountsCache();

    // Recalculate license utilization asynchronously (non-blocking)
    if (finalDoc) {
      recalculateLicenseUtilizationForJob(finalDoc).catch(err =>
        console.error("[PatchJob] License utilization recalc error:", err)
      );
    }

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
    }).lean();

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

export { invalidateCache as invalidateJobCache };
export default router;


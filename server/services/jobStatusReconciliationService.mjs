import JobModel from "../model/jobModel.mjs";
import BranchModel from "../model/branchModel.mjs";
import { determineDetailedStatus } from "../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../utils/statusColorMapper.mjs";
import { getJobStatusRank, getJobSortDate } from "../utils/jobRanking.mjs";
import { invalidateJobCache } from "../routes/import-dsr/getJobList.mjs";
import { invalidateJobTabCountsCache } from "../routes/import-dsr/getJobTabCounts.mjs";
import { recalculateContainersDetention } from "../utils/detentionHelper.mjs";
import { publishJobChange, onJobChange } from "./jobChangeBus.mjs";

const DEFAULT_RECONCILE_FILTER = {
  status: { $in: ["pending", "Pending", "PENDING"] },
  be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] },
};

// Fields read by determineDetailedStatus, getJobSortDate (incl. every STATUS_RANK_MAP field, at job
// and first-container level), recalculateContainersDetention and the checks in planReconcileUpdate.
// The sweep scans with only these; a job that looks out of date is reloaded in full before writing,
// so a field missing here can only delay a correction, never cause a wrong write.
const RECONCILE_SCAN_FIELDS = [
  "year", "status", "be_no", "branch_id", "detailed_status", "row_color", "status_rank", "status_sort_date",
  "free_time", "mode", "consignment_type", "type_of_b_e", "out_of_charge", "pcv_date", "discharge_date",
  "gateway_igm_date", "vessel_berthing", "type_of_Do", "do_completed", "bill_no", "delivery_completed_date",
  "isGeneralJob", "delivery_date", "igm_date", "igm_no", "billing_completed_date", "emptyContainerOffLoadDate",
  "detention_from", "be_date", "container_rail_out_date", "rail_out",
  ...[
    "arrival_date", "container_rail_out_date", "delivery_date", "emptyContainerOffLoadDate", "detention_from",
    "do_validity_upto_container_level", "billing_completed_date", "do_completed", "be_date", "discharge_date",
    "gateway_igm_date", "vessel_berthing", "rail_out",
  ].map((f) => `container_nos.${f}`),
].join(" ");

// Works out the update for one job, or null when its stored values are already right
function planReconcileUpdate(jobObj, branchConfigs) {
  const isCancelled =
    ["cancelled", "Cancelled", "CANCELLED"].includes(jobObj.status) ||
    ["cancelled", "Cancelled", "CANCELLED"].includes(jobObj.be_no);
  if (isCancelled) return null;

  const branchConfig = jobObj.branch_id ? branchConfigs.get(String(jobObj.branch_id)) || null : null;

  // --- Status reconciliation ---
  const computedStatus = determineDetailedStatus(jobObj, branchConfig);
  const computedColor = getRowColorFromStatus(computedStatus);
  const computedRank = getJobStatusRank(computedStatus);
  const computedSortDate = getJobSortDate(jobObj, computedStatus);

  const statusDiffers = jobObj.detailed_status !== computedStatus;
  const colorDiffers = jobObj.row_color !== computedColor;
  const rankDiffers = jobObj.status_rank !== computedRank;
  const oldSortTime = jobObj.status_sort_date ? new Date(jobObj.status_sort_date).getTime() : 0;
  const newSortTime = computedSortDate ? new Date(computedSortDate).getTime() : 0;
  const sortDateDiffers = oldSortTime !== newSortTime;

  // --- Detention reconciliation ---
  let detentionSetFields = null;
  const freeDays = parseInt(jobObj.free_time, 10) || 0;
  if (
    freeDays > 0 &&
    Array.isArray(jobObj.container_nos) &&
    jobObj.container_nos.length > 0
  ) {
    // Check if any container has arrival_date but missing/empty detention_from
    const needsDetentionFix = jobObj.container_nos.some((c) => {
      const arr = c.arrival_date ? String(c.arrival_date).trim() : "";
      const det = c.detention_from ? String(c.detention_from).trim() : "";
      return arr && !det;
    });

    if (needsDetentionFix) {
      const { containers: recalculated, do_validity_upto_job_level } =
        recalculateContainersDetention(jobObj.container_nos, freeDays, {
          mode: jobObj.mode,
          consignment_type: jobObj.consignment_type,
          type_of_b_e: jobObj.type_of_b_e,
        });

      // Use dot-notation to only update detention fields per container,
      // avoiding overwrite of other container fields (transporter, images, etc.)
      detentionSetFields = {};
      recalculated.forEach((c, i) => {
        const oldDet = jobObj.container_nos[i]?.detention_from || "";
        const newDet = c.detention_from || "";
        const oldVal = jobObj.container_nos[i]?.do_validity_upto_container_level || "";
        const newVal = c.do_validity_upto_container_level || "";
        if (oldDet !== newDet) {
          detentionSetFields[`container_nos.${i}.detention_from`] = newDet;
        }
        if (oldVal !== newVal) {
          detentionSetFields[`container_nos.${i}.do_validity_upto_container_level`] = newVal;
        }
      });
      if (do_validity_upto_job_level) {
        detentionSetFields.do_validity_upto_job_level = do_validity_upto_job_level;
      }
      // Only count as a fix if we actually have fields to update
      if (Object.keys(detentionSetFields).length === 0) {
        detentionSetFields = null;
      }
    }
  }

  const needsUpdate = statusDiffers || colorDiffers || rankDiffers || sortDateDiffers || detentionSetFields;
  if (!needsUpdate) return null;

  const setFields = {};

  if (statusDiffers || colorDiffers || rankDiffers || sortDateDiffers) {
    setFields.detailed_status = computedStatus;
    setFields.row_color = computedColor;
    setFields.status_rank = computedRank;
    setFields.status_sort_date = computedSortDate;

    if (computedStatus === "Billed") {
      setFields.status = "Completed";
    }
  }

  if (detentionSetFields) {
    Object.assign(setFields, detentionSetFields);
  }

  return { setFields, detentionFixed: Boolean(detentionSetFields) };
}

/**
 * Reconciles job detailed_status, row_color, status_rank, status_sort_date,
 * AND container detention_from / do_validity dates for jobs whose stored
 * values differ from recomputed values.
 *
 * @param {Object} queryFilter - Optional MongoDB filter to constrain scanned jobs
 * @param {Object} options - { invalidateCache: true, includeDetails: false }
 * @returns {Promise<{ scanned: number, updated: number, detentionFixed: number }>}
 */
export async function reconcileJobStatuses(queryFilter = null, options = { invalidateCache: true }) {
  try {
    const filter = queryFilter || DEFAULT_RECONCILE_FILTER;

    // Cache branch configs to avoid redundant DB calls
    const branchConfigs = new Map();
    const branches = await BranchModel.find({}).select("_id configuration").lean();
    for (const b of branches) {
      branchConfigs.set(String(b._id), b.configuration || null);
    }

    const cursor = JobModel.find(filter).select(RECONCILE_SCAN_FIELDS).lean().cursor();
    const bulkOps = [];
    let scanned = 0;
    let updated = 0;
    let detentionFixed = 0;
    const updatedIds = [];
    const updatedYears = new Set();

    for await (const scannedJob of cursor) {
      scanned++;
      if (!planReconcileUpdate(scannedJob, branchConfigs)) continue;

      // Looks out of date: decide on the full document, exactly as a full scan would
      const jobObj = await JobModel.findById(scannedJob._id).lean();
      const plan = jobObj ? planReconcileUpdate(jobObj, branchConfigs) : null;
      if (!plan) continue;

      if (plan.detentionFixed) detentionFixed++;
      bulkOps.push({
        updateOne: {
          filter: { _id: jobObj._id },
          update: { $set: plan.setFields },
        },
      });

      updated++;
      updatedIds.push(jobObj._id);
      if (jobObj.year) updatedYears.add(jobObj.year);

      if (bulkOps.length >= 200) {
        await JobModel.bulkWrite(bulkOps);
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await JobModel.bulkWrite(bulkOps);
    }

    if (updated > 0 && options.invalidateCache) {
      invalidateJobCache();
      invalidateJobTabCountsCache();
    }

    // bulkWrite bypasses model hooks: tell other workers and open pages directly
    if (updatedIds.length > 0) {
      publishJobChange({ ids: updatedIds, years: [...updatedYears], source: "reconcile" });
    }

    return {
      scanned,
      updated,
      detentionFixed,
    };
  } catch (error) {
    console.error("❌ Error in reconcileJobStatuses:", error);
    throw error;
  }
}

/**
 * Reconcile jobs as soon as they change, instead of waiting for the periodic sweep.
 * Uses the same filter and computation as the sweep. Run on one worker only.
 * @returns {Function} stop function
 */
export function startRealtimeReconciliation({ delayMs = 1000 } = {}) {
  const pendingIds = new Set();
  let timer = null;
  let running = false;

  const schedule = () => {
    if (!timer) timer = setTimeout(run, delayMs);
  };

  const run = async () => {
    timer = null;
    if (running) {
      schedule();
      return;
    }
    const ids = [...pendingIds];
    pendingIds.clear();
    if (ids.length === 0) return;

    running = true;
    try {
      const res = await reconcileJobStatuses(
        { ...DEFAULT_RECONCILE_FILTER, _id: { $in: ids } },
        { invalidateCache: true }
      );
      if (res.updated > 0) {
        console.log(`✅ [JobStatusReconciliation] Real-time reconciled ${res.updated} of ${ids.length} changed jobs.`);
      }
    } catch (err) {
      console.error("❌ [JobStatusReconciliation] Real-time reconcile failed:", err);
    } finally {
      running = false;
      if (pendingIds.size > 0) schedule();
    }
  };

  const unsubscribe = onJobChange((change) => {
    // Our own writes come back as "reconcile" events; skipping them prevents loops
    if (change.source === "reconcile" || !Array.isArray(change.ids) || change.ids.length === 0) return;
    change.ids.forEach((id) => pendingIds.add(String(id)));
    schedule();
  });

  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}

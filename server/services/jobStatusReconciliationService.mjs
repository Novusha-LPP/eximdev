import JobModel from "../model/jobModel.mjs";
import BranchModel from "../model/branchModel.mjs";
import { determineDetailedStatus } from "../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../utils/statusColorMapper.mjs";
import { getJobStatusRank, getJobSortDate } from "../utils/jobRanking.mjs";
import { invalidateJobCache } from "../routes/import-dsr/getJobList.mjs";
import { invalidateJobTabCountsCache } from "../routes/import-dsr/getJobTabCounts.mjs";
import { recalculateContainersDetention } from "../utils/detentionHelper.mjs";

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
    const filter = queryFilter || {
      status: { $in: ["pending", "Pending", "PENDING"] },
      be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] },
    };

    // Cache branch configs to avoid redundant DB calls
    const branchConfigs = new Map();
    const branches = await BranchModel.find({}).select("_id configuration").lean();
    for (const b of branches) {
      branchConfigs.set(String(b._id), b.configuration || null);
    }

    const cursor = JobModel.find(filter).lean().cursor();
    const bulkOps = [];
    let scanned = 0;
    let updated = 0;
    let detentionFixed = 0;

    for await (const jobObj of cursor) {
      scanned++;

      const isCancelled =
        ["cancelled", "Cancelled", "CANCELLED"].includes(jobObj.status) ||
        ["cancelled", "Cancelled", "CANCELLED"].includes(jobObj.be_no);
      if (isCancelled) continue;

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
          if (Object.keys(detentionSetFields).length > 0) {
            detentionFixed++;
          } else {
            detentionSetFields = null;
          }
        }
      }

      const needsUpdate = statusDiffers || colorDiffers || rankDiffers || sortDateDiffers || detentionSetFields;

      if (needsUpdate) {
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

        bulkOps.push({
          updateOne: {
            filter: { _id: jobObj._id },
            update: { $set: setFields },
          },
        });

        updated++;
      }

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

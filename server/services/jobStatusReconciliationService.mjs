import JobModel from "../model/jobModel.mjs";
import BranchModel from "../model/branchModel.mjs";
import { determineDetailedStatus } from "../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../utils/statusColorMapper.mjs";
import { getJobStatusRank, getJobSortDate } from "../utils/jobRanking.mjs";
import { invalidateJobCache } from "../routes/import-dsr/getJobList.mjs";
import { invalidateJobTabCountsCache } from "../routes/import-dsr/getJobTabCounts.mjs";

/**
 * Reconciles job detailed_status, row_color, status_rank, and status_sort_date
 * for jobs whose stored status differs from determineDetailedStatus().
 *
 * @param {Object} queryFilter - Optional MongoDB filter to constrain scanned jobs
 * @param {Object} options - { invalidateCache: true, includeDetails: false }
 * @returns {Promise<{ scanned: number, updated: number }>}
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

    for await (const jobObj of cursor) {
      scanned++;

      const isCancelled =
        ["cancelled", "Cancelled", "CANCELLED"].includes(jobObj.status) ||
        ["cancelled", "Cancelled", "CANCELLED"].includes(jobObj.be_no);
      if (isCancelled) continue;

      const branchConfig = jobObj.branch_id ? branchConfigs.get(String(jobObj.branch_id)) || null : null;

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

      if (statusDiffers || colorDiffers || rankDiffers || sortDateDiffers) {
        const setFields = {
          detailed_status: computedStatus,
          row_color: computedColor,
          status_rank: computedRank,
          status_sort_date: computedSortDate,
        };

        if (computedStatus === "Billed") {
          setFields.status = "Completed";
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
    };
  } catch (error) {
    console.error("❌ Error in reconcileJobStatuses:", error);
    throw error;
  }
}

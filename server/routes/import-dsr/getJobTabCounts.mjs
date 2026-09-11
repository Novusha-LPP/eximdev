import express from "express";
import JobModel from "../../model/jobModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { applyUserBranchFilter } from "../../middleware/branchMiddleware.mjs";
import { applyUserImporterFilter } from "../../middleware/icdFilter.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

const router = express.Router();

// In-memory cache for tab counts (TTL 30s)
const countsCache = new Map();
const CACHE_TTL_MS = 30 * 1000;

export const invalidateJobTabCountsCache = () => {
  countsCache.clear();
};

router.get(
  "/api/:year/job-tab-counts",
  authMiddleware,
  applyUserBranchFilter,
  applyUserImporterFilter,
  async (req, res) => {
    try {
      const { year } = req.params;
      const { branchId, category, mode } = req.query;

      const userIdentifier = req.currentUser?.username || req.user?.username || "anonymous";
      const cacheKey = `${year}|${branchId || "all"}|${category || "all"}|${mode || "all"}|${userIdentifier}`;

      const cached = countsCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      // Base query
      const baseQuery = { year };
      const baseAnd = [];

      if (req.userImporterFilter) {
        baseAnd.push(req.userImporterFilter);
      }

      const branchMatch = getBranchMatch(branchId, category, req.authorizedBranchIds);
      Object.assign(baseQuery, branchMatch);

      if (mode && mode.toLowerCase() !== "all") {
        baseQuery.mode = mode.toUpperCase();
      }

      // 1. Pending Query
      const pendingQuery = {
        ...baseQuery,
        $and: [
          ...(baseAnd.length ? baseAnd : []),
          { status: { $in: ["pending", "Pending", "PENDING"] } },
          { be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } },
          {
            $or: [
              { bill_date: { $in: [null, ""] } },
              { status: { $in: ["pending", "Pending", "PENDING"] } },
              { dsr_queries: { $elemMatch: { select_module: "DSR", resolved: { $ne: true } } } },
            ],
          },
        ],
      };

      // 2. Completed Query
      const completedQuery = {
        ...baseQuery,
        $and: [
          ...(baseAnd.length ? baseAnd : []),
          { status: { $in: ["completed", "Completed", "COMPLETED"] } },
          { be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } },
          {
            $or: [
              { bill_date: { $nin: [null, ""] } },
              { status: { $in: ["completed", "Completed", "COMPLETED"] } },
            ],
          },
        ],
      };

      // 3. Cancelled Query
      const cancelledQuery = {
        ...baseQuery,
        $and: [
          ...(baseAnd.length ? baseAnd : []),
          {
            $or: [
              { status: { $in: ["cancelled", "Cancelled", "CANCELLED"] } },
              { be_no: { $in: ["cancelled", "Cancelled", "CANCELLED"] } },
            ],
          },
        ],
      };

      // 4. Billing Confirmation Query
      const billingQuery = {
        ...baseQuery,
        $and: [
          ...(baseAnd.length ? baseAnd : []),
          { bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] } },
          {
            $or: [
              { billing_confirmation_date: { $exists: false } },
              { billing_confirmation_date: null },
              { billing_confirmation_date: "" },
            ],
          },
          {
            $or: [
              { billing_completed_date: { $exists: false } },
              { billing_completed_date: null },
              { billing_completed_date: "" },
            ],
          },
          { be_no: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } },
          { status: { $nin: ["cancelled", "Cancelled", "CANCELLED"] } },
        ],
      };

      const [Pending, Completed, Cancelled, Billing_Confirmation] = await Promise.all([
        JobModel.countDocuments(pendingQuery),
        JobModel.countDocuments(completedQuery),
        JobModel.countDocuments(cancelledQuery),
        JobModel.countDocuments(billingQuery),
      ]);

      const counts = {
        Pending,
        Completed,
        Cancelled,
        Billing_Confirmation,
      };

      countsCache.set(cacheKey, { data: counts, ts: Date.now() });

      return res.json(counts);
    } catch (error) {
      console.error("Error in getJobTabCounts:", error);
      return res.status(500).json({
        message: "Error fetching job tab counts",
        error: error.message,
      });
    }
  }
);

export default router;

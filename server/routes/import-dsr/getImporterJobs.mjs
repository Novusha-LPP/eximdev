import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";
import UserBranchModel from "../../model/userBranchModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

// ✅ Utility function to format importer name
function formatImporter(importer) {
  return importer
    .toLowerCase()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[\.\-\/,\(\)\[\]]/g, "") // Remove unwanted symbols
    .replace(/_+/g, "_"); // Remove multiple underscores
}

// ✅ API Endpoint to get job counts for an importer
router.get("/api/get-importer-jobs/:importerURL/:year", authMiddleware, async (req, res) => {
  try {
    const { importerURL, year } = req.params;
    const { category } = req.query;
    let { branchId } = req.query;
    const formattedImporter = formatImporter(importerURL);

    const userId = req.headers['user-id'] || req.user?.username || req.user?._id;
    const role = req.user?.role;

    // Filter by assignments if 'all' is requested
    if (!branchId || branchId.toString().toLowerCase() === "all" || branchId === "") {
      const assignments = await UserBranchModel.find({ user_id: userId });
      if (assignments.length > 0) {
        branchId = assignments.map(a => a.branch_id.toString());
      } else if (role !== 'Admin') {
        return res.json([0, 0, 0, 0]);
      }
    }

    // 🚀 Aggregation to count jobs efficiently
    const jobCounts = await JobModel.aggregate([
      {
        $match: {
          year: year,
          importerURL: new RegExp(`^${formattedImporter}$`, "i"), // Case-insensitive matching
          ...getBranchMatch(branchId, category)
        },
      },
      {
        $group: {
          _id: null,
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] },
          },
          totalCount: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true); // ✅ Enable disk use for large data

    // ✅ Prepare response array
    const responseArray =
      jobCounts.length > 0
        ? [
          jobCounts[0].totalCount,
          jobCounts[0].pendingCount,
          jobCounts[0].completedCount,
          jobCounts[0].cancelledCount,
        ]
        : [0, 0, 0, 0];

    res.json(responseArray);
  } catch (error) {
    console.error("Error fetching job counts by importer:", error);
    res.status(500).json({ error: "Error fetching job counts by importer" });
  }
});

export default router;

import express from "express";
// JobModel is now attached to req by branchJobMiddleware

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
router.get("/api/get-importer-jobs/:importerURL/:year", async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const { year, importerURL } = req.params;
    const formattedImporter = formatImporter(importerURL);

    // 🚀 Aggregation to count jobs efficiently
    const jobCounts = await JobModel.aggregate([
      {
        $match: {
          year: year,
          importerURL: new RegExp(`^${formattedImporter}$`, "i"), // Case-insensitive matching
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

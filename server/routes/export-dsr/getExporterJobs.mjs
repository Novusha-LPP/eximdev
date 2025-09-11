import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

// ✅ Utility function to format exporter name
function formatExporter(exporter) {
  return exporter
    .toLowerCase()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[\.\-\/,\(\)\[\]]/g, "") // Remove unwanted symbols
    .replace(/_+/g, "_"); // Remove multiple underscores
}

// ✅ API Endpoint to get job counts for an exporter
router.get("/api/get-exporter-jobs/:exporterURL/:year", async (req, res) => {
  try {
    const { year, exporterURL } = req.params;
    const formattedExporter = formatExporter(exporterURL);

    // 🚀 Aggregation to count jobs efficiently
    const jobCounts = await ExJobModel.aggregate([
      {
        $match: {
          year: year,
          exporterURL: new RegExp(`^${formattedExporter}$`, "i"), // Case-insensitive matching
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
    console.error("Error fetching job counts by exporter:", error);
    res.status(500).json({ error: "Error fetching job counts by exporter" });
  }
});

export default router;

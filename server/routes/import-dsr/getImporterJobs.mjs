import express from "express";
import JobModel from "../../model/jobModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

// ✅ Utility function to format importer name
function formatImporter(importer) {
  return importer
    .toLowerCase()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[\.\-\/,\(\)\[\]]/g, "") // Remove unwanted symbols
    .replace(/_+/g, "_"); // Remove multiple underscores
}

// ✅ Index creation to ensure efficient querying (run this only once or during startup)
// async function ensureIndexes() {
//   try {
//     await JobModel.createIndexes([
//       { year: 1 },
//       { importerURL: 1 },
//       { status: 1 },
//     ]);
//    
//   } catch (error) {
//     console.error("Error creating indexes:", error);
//   }
// }
// ensureIndexes();

// ✅ API Endpoint to get job counts for an importer
router.get("/api/get-importer-jobs/:importerURL/:year", authenticateJWT, async (req, res) => {
  try {
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

router.get('/api/import-dsr/importer-jobs', async (req, res) => {
  const { status, page = 1, limit = 100, search = '', year, importer } = req.query;
  
  try {
    // DB query implementation (would need to be expanded with actual query logic)
    const skip = (page - 1) * limit;
    
    // Build the query conditions
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (year) {
      query.year = year;
    }
    
    if (importer) {
      query.importerURL = formatImporter(importer);
    }
    
    if (search) {
      // Add search conditions
      query.$or = [
        { jobNumber: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
        // Add other fields as needed
      ];
    }
    
    // Execute the query
    const result = {
      jobs: await JobModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      totalCount: await JobModel.countDocuments(query)
    };
    
    return res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching importer jobs:", err);
    res.status(500).json({ error: "Error fetching importer jobs" });
  }
});

export default router;
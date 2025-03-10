import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();


// Utility function to format importer name
function formatImporter(importer) {
  return importer
    .toLowerCase()
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[\.\-\/,\(\)\[\]]/g, "") // Remove unwanted symbols
    .replace(/_+/g, "_"); // Remove multiple underscores
}

// API Endpoint to get job counts for an importer
router.get("/api/get-importer-jobs/:importerURL/:year", async (req, res) => {
  try {
    const { year, importerURL } = req.params;
    const formattedImporter = formatImporter(importerURL);

    // Debug: Check actual data in database
    const dbResults = await JobModel.find({ year });
    // MongoDB Aggregation to get job counts
    const jobCounts = await JobModel.aggregate([
      {
        $match: {
          year: year,
          $or: [
            { importerURL: formattedImporter }, // Exact match
            { importerURL: formattedImporter.replace(/_/g, " ") }, // Spaces instead of underscores
            { importerURL: formattedImporter.toUpperCase() }, // Uppercase match
            { importerURL: formattedImporter.toLowerCase() } // Lowercase match
          ]
        }
      },
      {
        $group: {
          _id: null,
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          completedCount: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    // Prepare response array
    const responseArray = jobCounts.length > 0
      ? [jobCounts[0].totalCount, jobCounts[0].pendingCount, jobCounts[0].completedCount, jobCounts[0].cancelledCount]
      : [0, 0, 0, 0];

    res.json(responseArray);
  } catch (error) {
    res.status(500).json({ error: "Error fetching job counts by importer" });
  }
});


export default router;

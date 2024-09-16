import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-importer-jobs/:importerURL/:year", async (req, res) => {
  try {
    const { year, importerURL } = req.params;

    // Use Mongoose aggregation to count jobs with different statuses
    const jobCounts = await JobModel.aggregate([
      {
        $match: {
          year: year,
          importerURL: importerURL,
        }, // Filter documents by year and importerURL
      },
      {
        $group: {
          _id: null, // Group all documents together
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          canceledCount: {
            $sum: { $cond: [{ $eq: ["$status", "Canceled"] }, 1, 0] },
          },
          totalCount: { $sum: 1 }, // Count total jobs
        },
      },
    ]);

    // Extract the result from the aggregation and format it as an array
    const responseArray = [];
    if (jobCounts.length > 0) {
      responseArray.push(jobCounts[0].totalCount);
      responseArray.push(jobCounts[0].pendingCount);
      responseArray.push(jobCounts[0].completedCount);
      responseArray.push(jobCounts[0].canceledCount);
    } else {
      // If no matching documents are found, set all counts to 0
      responseArray.push(0, 0, 0, 0);
    }

    res.json(responseArray);
  } catch (error) {
    console.error("Error fetching job counts by importer:", error);
    res.status(500).json({ error: "Error fetching job counts by importer" });
  }
});

export default router;

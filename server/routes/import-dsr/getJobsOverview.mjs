import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-jobs-overview/:year", async (req, res) => {
  try {
    const { year } = req.params;
    // Use Mongoose aggregation to count jobs with different statuses
    const jobCounts = await JobModel.aggregate([
      {
        $match: { year: year }, // Filter documents by year
      },
      {
        $group: {
          _id: null, // Group all documents together
          pendingJobs: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          completedJobs: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          canceledJobs: {
            $sum: { $cond: [{ $eq: ["$status", "Canceled"] }, 1, 0] },
          },
          totalJobs: { $sum: 1 }, // Count total jobs
        },
      },
      {
        $project: {
          _id: 0,
          pendingJobs: 1,
          completedJobs: 1,
          canceledJobs: 1,
          totalJobs: 1,
        },
      },
    ]);

    // Extract the result from the aggregation and send it as JSON response
    const responseObj = jobCounts[0] || {
      pendingCount: 0,
      completedCount: 0,
      canceledCount: 0,
      totalCount: 0,
    };

    res.json(responseObj);
  } catch (error) {
    console.error("Error fetching job counts:", error);
    res.status(500).json({ error: "Error fetching job counts" });
  }
});

export default router;

import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-jobs-overview/:year", async (req, res) => {
  try {
    const { year } = req.params;

    // Optional: Validate the year format (e.g., four-digit year)
    if (!/^\d{4}$/.test(year)) {
      return res.status(400).json({ error: "Invalid year format" });
    }

    // Convert year to number if necessary
    // const numericYear = parseInt(year, 10);

    // Use Mongoose aggregation to count jobs with different statuses
    const jobCounts = await JobModel.aggregate([
      {
        $match: { year: year }, // Or { year: numericYear } if year is a number
      },
      {
        $group: {
          _id: null, // Group all documents together
          pendingJobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },
          completedJobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
            },
          },
          cancelledJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    // { $eq: ["$status", "Cancelled"] },
                    { $eq: ["$be_no", "CANCELLED"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalJobs: { $sum: 1 }, // Count total jobs
        },
      },
      {
        $project: {
          _id: 0,
          pendingJobs: 1,
          completedJobs: 1,
          cancelledJobs: 1,
          totalJobs: 1,
        },
      },
    ]);

    // Extract the result from the aggregation and send it as JSON response
    const responseObj = jobCounts[0] || {
      pendingJobs: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      totalJobs: 0,
    };

    res.json(responseObj);
  } catch (error) {
    console.error("Error fetching job counts:", error);
    res.status(500).json({ error: "Error fetching job counts" });
  }
});

export default router;

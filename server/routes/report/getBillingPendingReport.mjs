import express from "express";
// JobModel is now attached to req by branchJobMiddleware
import logger from "../../logger.js";

const router = express.Router();

// GET /api/report/billing-pending?year=22-23
router.get("/api/report/billing-pending", async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    // Get year from query params, default to "25-26" if not provided
    const year = req.query.year || "25-26";

    const result = await JobModel.aggregate([
      {
        $match: {
          year: year,
          status: "Pending",
          detailed_status: "Billing Pending"
        }
      },
      {
        $facet: {
          totalCount: [
            { $count: "count" }
          ],
          results: [
            {
              $project: {
                _id: 0,
                job_no: 1,
                importer: 1,
                status: 1,
                detailed_status: 1,
                year: 1
              }
            }
          ],
          importerCount: [
            {
              $group: {
                _id: "$importer",
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                importer: "$_id",
                count: 1
              }
            }
          ]
        }
      }
    ]);

    const [data] = result;

    res.status(200).json({
      count: data.totalCount[0]?.count || 0,
      importerCount: data.importerCount,
      results: data.results
    });

  } catch (error) {
    logger.error("Error generating billing pending report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

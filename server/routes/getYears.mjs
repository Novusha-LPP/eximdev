import express from "express";
// JobModel is now attached to req by branchJobMiddleware

const router = express.Router();

router.get("/api/get-years", async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const pipeline = [
      // Group by year to get distinct years
      {
        $group: {
          _id: "$year",
        },
      },

      // Sort the years in ascending order
      {
        $sort: {
          _id: -1,
        },
      },

      // Project to shape the output
      {
        $project: {
          year: "$_id",
          _id: 0,
        },
      },
    ];

    const result = await JobModel.aggregate(pipeline);

    // Extract the sorted years from the result
    const yearsList = result.map((item) => item.year);
    res.status(200).json(yearsList);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching years list.");
  }
});

export default router;

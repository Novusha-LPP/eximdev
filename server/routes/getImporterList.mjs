import express from "express";
// JobModel is now attached to req by branchJobMiddleware

const router = express.Router();

// GET importers by year + status + detailedStatus
// Example: /api/get-importer-list/25-26?status=Completed&detailedStatus=Discharged
router.get("/api/get-importer-list/:year", async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const selectedYear = req.params.year;
    const { status, detailedStatus } = req.query;

    // base match: year
    const matchStage = { year: selectedYear };

    // optional status filter (if provided and not "all")
    if (status && status !== "all") {
      matchStage.status = status;
    }

    // optional detailedStatus filter (if provided and not "all")
    if (detailedStatus && detailedStatus !== "all") {
      matchStage.detailed_status = detailedStatus;
    }

    const uniqueImporters = await JobModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { importer: "$importer", importerURL: "$importerURL" },
          ie_code_no: { $first: "$ie_code_no" },
        },
      },
      {
        $project: {
          _id: 0,
          importer: "$_id.importer",
          importerURL: "$_id.importerURL",
          ie_code_no: "$ie_code_no",
        },
      },
      { $sort: { importer: 1 } },
    ]);

    res.status(200).json(uniqueImporters);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while fetching importers.");
  }
});

export default router;

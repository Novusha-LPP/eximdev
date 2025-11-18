import express from "express";
import JobModel from "../model/jobModel.mjs";

const router = express.Router();

// GET importers by year + status + detailedStatus
// Example: /api/get-importer-list/25-26?status=Completed&detailedStatus=Discharged
router.get("/api/get-importer-list/:year", async (req, res) => {
  try {
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
        },
      },
      {
        $project: {
          _id: 0,
          importer: "$_id.importer",
          importerURL: "$_id.importerURL",
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

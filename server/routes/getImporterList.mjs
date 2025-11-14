import express from "express";
import JobModel from "../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-importer-list/:year", async (req, res) => {
  try {
    const selectedYear = req.params.year;
    const { detailedStatus } = req.query; // Get optional detailedStatus filter

    // Build the match stage with year and optional detailedStatus
    const matchStage = { year: selectedYear };

    // If detailedStatus is provided and not "all", filter by detailed_status
    if (detailedStatus && detailedStatus !== "all") {
      matchStage.detailed_status = detailedStatus;
    }

    // Use Mongoose aggregation to group and retrieve unique importer and importerURL values
    const uniqueImporters = await JobModel.aggregate([
      {
        $match: matchStage, // Filter documents by year and optionally by status
      },
      {
        $group: {
          _id: { importer: "$importer", importerURL: "$importerURL" },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          importer: "$_id.importer",
          importerURL: "$_id.importerURL",
        },
      },
      {
        $sort: {
          importer: 1, // Sort importer in ascending order (alphabetical)
        },
      },
    ]);

    res.status(200).json(uniqueImporters);
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while fetching importers.");
  }
});

export default router;

import express from "express";
import JobModel from "../model/jobModel.mjs";
import { authenticateJWT } from "../auth/auth.mjs";
const router = express.Router();

router.get("/api/get-importer-list/:year", authenticateJWT,async (req, res) => {
  try {
    const selectedYear = req.params.year;

    // Use Mongoose aggregation to group and retrieve unique importer and importerURL values
    const uniqueImporters = await JobModel.aggregate([
      {
        $match: { year: selectedYear }, // Filter documents by year
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

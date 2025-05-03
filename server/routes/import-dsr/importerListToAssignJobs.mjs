import express from "express";
import JobModel from "../../model/jobModel.mjs";
import UserModel from "../../model/userModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/importer-list-to-assign-jobs",authenticateJWT, async (req, res) => {
  try {
    // Get all importers from the JobModel
    const importers = await JobModel.aggregate([
      // Group by importer to get distinct importers
      {
        $group: {
          _id: "$importer",
        },
      },
      // Sort the importers by name in ascending order
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    // Fetch all assigned importers from the UserModel
    const assignedImporters = await UserModel.distinct("importers.importer");

    // Filter out the importers that are assigned to any user
    const unassignedImporters = importers.filter((importer) => {
      return !assignedImporters.includes(importer._id);
    });

    // Extract the importer names from the filtered importers
    const importerNames = unassignedImporters.map((importer) => importer._id);

    res.status(200).json(importerNames);
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while fetching importers.");
  }
});

export default router;

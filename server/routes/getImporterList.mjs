import express from "express";
import JobModel from "../model/jobModel.mjs";
import { getBranchMatch } from "../utils/branchFilter.mjs";
import authMiddleware from "../middleware/authMiddleware.mjs";
import { applyUserBranchFilter } from "../middleware/branchMiddleware.mjs";

const router = express.Router();

// GET importers by year + status + detailedStatus
// Example: /api/get-importer-list/25-26?status=Completed&detailedStatus=Discharged
router.get("/api/get-importer-list/:year", authMiddleware, applyUserBranchFilter, async (req, res) => {
  try {
    const selectedYear = req.params.year;
    const { status, detailedStatus, branchId, category } = req.query;

    // base match: empty object to fetch all importers irrespective of year, but filter out null/empty ones and exclude 24-25 as it had no IE codes
    const matchStage = {
      importer: { $nin: [null, ""] },
      year: { $ne: "24-25" },
      ...getBranchMatch(branchId, category, req.authorizedBranchIds)
    };

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
        $addFields: {
          normalizedImporter: { $toUpper: { $trim: { input: "$importer" } } }
        }
      },
      {
        $group: {
          _id: "$normalizedImporter",
          importer: { $first: "$importer" }, // Keep original case for display if preferred, or use normalized
          importerURL: { $first: "$importerURL" },
          ie_code_no: { $first: "$ie_code_no" },
        },
      },
      {
        $project: {
          _id: 0,
          importer: 1,
          importerURL: 1,
          ie_code_no: 1,
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

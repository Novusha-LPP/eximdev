import express from "express";
import JobModel from "../model/jobModel.mjs";
import { getBranchMatch } from "../utils/branchFilter.mjs";
import { applyUserBranchFilter } from "../middleware/branchMiddleware.mjs";

const router = express.Router();

const getShippingLinesHandler = async (req, res) => {
  try {
    const selectedYear = req.params.year;
    const { branchId, category } = req.query;

    const matchStage = {
      shipping_line_airline: { $nin: [null, ""] },
      ...getBranchMatch(branchId, category, req.authorizedBranchIds),
    };

    if (selectedYear && selectedYear !== "all") {
      matchStage.year = selectedYear;
    }

    const uniqueShippingLines = await JobModel.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          trimmedName: { $trim: { input: "$shipping_line_airline" } },
        },
      },
      {
        $match: {
          trimmedName: { $ne: "" },
        },
      },
      {
        $group: {
          _id: { $toUpper: "$trimmedName" },
          shipping_line_airline: { $first: "$trimmedName" },
        },
      },
      {
        $project: {
          _id: 0,
          shipping_line_airline: 1,
        },
      },
      {
        $sort: {
          shipping_line_airline: 1,
        },
      },
    ]);

    res.status(200).json(uniqueShippingLines);
  } catch (error) {
    console.error("Error in get-shipping-lines:", error);
    res.status(500).json({ message: "An error occurred while fetching shipping lines." });
  }
};

router.get("/api/get-shipping-lines/:year", applyUserBranchFilter, getShippingLinesHandler);
router.get("/api/get-shipping-lines-list", applyUserBranchFilter, getShippingLinesHandler);
router.get("/api/get-shipping-lines-list/:year", applyUserBranchFilter, getShippingLinesHandler);

export default router;


import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-pr-data/:branch",authenticateJWT, async (req, res) => {
  const { branch } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const matchStage = [];

    // Branch filtering using pr_no
    if (branch !== "all") {
      matchStage.push({
        $expr: {
          $eq: [{ $arrayElemAt: [{ $split: ["$pr_no", "/"] }, 1] }, branch],
        },
      });
    }

    // Filtering documents where containers are missing, empty, or have at least one container without tr_no
    matchStage.push({
      $or: [
        { containers: { $exists: false } },
        { containers: { $size: 0 } },
        {
          containers: {
            $elemMatch: {
              $or: [
                { tr_no: { $exists: false } },
                { tr_no: "" },
                { tr_no: null },
              ],
            },
          },
        },
      ],
    });

    const pipeline = [
      { $match: { $and: matchStage } },
      {
        $addFields: {
          pr_serial: {
            $convert: {
              input: { $arrayElemAt: [{ $split: ["$pr_no", "/"] }, 2] }, // Extract serial part
              to: "int",
              onError: null, // Handle invalid conversions
              onNull: null, // Handle missing values
            },
          },
          pr_year_end: {
            $convert: {
              input: {
                $arrayElemAt: [
                  {
                    $split: [
                      { $arrayElemAt: [{ $split: ["$pr_no", "/"] }, 3] },
                      "-",
                    ],
                  },
                  1,
                ],
              },
              to: "int",
              onError: null, // Handle invalid conversions
              onNull: null, // Handle missing values
            },
          },
        },
      },
      {
        $sort: {
          pr_year_end: -1, // Sort by year (e.g., 25 from '24-25') descending
          pr_serial: -1, // Then sort by serial descending
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: parseInt(limit) }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    // console.log("Executing pipeline:", JSON.stringify(pipeline, null, 2));

    const result = await PrData.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No PR data found" });
    }

    const data = result[0].data || [];
    const total = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error in get-pr-data:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

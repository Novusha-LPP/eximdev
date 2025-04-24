import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.get("/api/get-pr-data/:branch", async (req, res) => {
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
            $toInt: {
              $arrayElemAt: [{ $split: ["$pr_no", "/"] }, 2], // '00204' -> 204
            },
          },
          pr_year_end: {
            $toInt: {
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

    const result = await PrData.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

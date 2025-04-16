import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/pr-job-list",authenticateJWT, async (req, res) => {
  try {
    const { status } = req.query; // Only status is received
    const { page = 1, limit = 100, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build aggregation pipeline based on status
    const matchCondition =
      status?.toLowerCase() === "pending"
        ? {
            $or: [
              { status: { $exists: false } },
              { status: "" },
              { status: "pending" },
            ],
          }
        : status?.toLowerCase() === "completed"
        ? {
            $expr: {
              $eq: [
                { $size: "$containers" },
                {
                  $size: {
                    $filter: {
                      input: "$containers",
                      as: "container",
                      cond: "$$container.lr_completed",
                    },
                  },
                },
              ],
            },
          }
        : {}; // Default to an empty condition if no valid status is provided

    const pipeline = [
      { $match: matchCondition },
      {
        $match: {
          $or: [
            { pr_no: { $regex: search, $options: "i" } },
            { consignor: { $regex: search, $options: "i" } },
            { consignee: { $regex: search, $options: "i" } },
          ],
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          // Include all fields from the schema
          pr_no: 1,
          pr_date: 1,
          import_export: 1,
          branch: 1,
          consignor: 1,
          consignee: 1,
          container_type: 1,
          container_count: 1,
          gross_weight: 1,
          type_of_vehicle: 1,
          no_of_vehicle: 1,
          description: 1,
          shipping_line: 1,
          container_loading: 1,
          container_offloading: 1,
          do_validity: 1,
          instructions: 1,
          document_no: 1,
          document_date: 1,
          goods_pickup: 1,
          goods_delivery: 1,
          status: 1,
        },
      },
    ];

    const data = await PrData.aggregate(pipeline);
    const total = await PrData.countDocuments(matchCondition);

    res.json({
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

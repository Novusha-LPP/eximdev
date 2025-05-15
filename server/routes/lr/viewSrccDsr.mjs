import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/view-srcc-dsr", async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const pipeline = [
      {
        $unwind: "$containers",
      },
      {
        $match: {
          $or: [
            { "containers.lr_completed": false },
            { "containers.lr_completed": { $exists: false } }
          ],
          "containers.tr_no": { $exists: true, $ne: "" }
        },
      },
      {
        $addFields: {
          tr_no_split: { $split: ["$containers.tr_no", "/"] },
        },
      },
      {
        $addFields: {
          tr_no_numeric: {
            $toInt: { $arrayElemAt: ["$tr_no_split", 2] },
          },
        },
      },
      {
        $sort: { tr_no_numeric: -1 },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                tr_no: "$containers.tr_no",
                container_number: "$containers.container_number",
                consignor: 1,
                consignee: 1,
                goods_delivery: "$containers.goods_delivery",
                branch: 1,
                vehicle_no: "$containers.vehicle_no",
                driver_name: "$containers.driver_name",
                driver_phone: "$containers.driver_phone",
                sr_cel_no: "$containers.sr_cel_no",
                sr_cel_FGUID: "$containers.sr_cel_FGUID",
                sr_cel_id: "$containers.sr_cel_id",
                shipping_line: 1,
                container_offloading: 1,
                do_validity: 1,
                status: "$containers.status",
                lr_completed: {
                  $ifNull: ["$containers.lr_completed", false],
                },
              },
            },
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const result = await PrData.aggregate(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    res.status(200).json({
      data,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error("Error fetching optimized DSR data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

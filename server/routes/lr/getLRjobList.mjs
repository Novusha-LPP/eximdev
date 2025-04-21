import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.get("/api/lr-job-list", async (req, res) => {
  try {
    const { status } = req.query;
    const { page = 1, limit = 100, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // const matchCondition =
    //   status?.toLowerCase() === "pending"
    //     ? {
    //         $or: [
    //           { "containers.lr_completed": { $exists: false } }, // Missing field
    //           { "containers.lr_completed": false }, // Explicitly false
    //         ],
    //       }
    //     : { "containers.lr_completed": true }; // Explicitly true
    let matchCondition = {};

    if (status?.toLowerCase() === "pending") {
      matchCondition = {
        $or: [
          { "containers.lr_completed": { $exists: false } },
          { "containers.lr_completed": false },
        ],
      };
    } else if (status?.toLowerCase() === "completed") {
      matchCondition = { "containers.lr_completed": true };
    } else if (status?.toLowerCase() === "all" || !status) {
      matchCondition = {}; // No filter — include all containers
    }

    const pipeline = [
      { $unwind: "$containers" }, // Flatten the containers array
      { $match: matchCondition }, // Apply the match condition
      {
        $match: {
          $or: [
            { pr_no: { $regex: search, $options: "i" } },
            { consignor: { $regex: search, $options: "i" } },
            { consignee: { $regex: search, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          pr_no: 1,
          pr_date: 1,
          branch: 1,
          consignor: 1,
          container_count: 1,
          no_of_vehicle: 1,
          "container_details.tr_no": { $ifNull: ["$containers.tr_no", null] },
          "container_details.container_number": {
            $ifNull: ["$containers.container_number", null],
          },
          "container_details.seal_no": {
            $ifNull: ["$containers.seal_no", null],
          },
          "container_details.gross_weight": {
            $ifNull: ["$containers.gross_weight", null],
          },
          "container_details.tare_weight": {
            $ifNull: ["$containers.tare_weight", null],
          },
          "container_details.net_weight": {
            $ifNull: ["$containers.net_weight", null],
          },
          "container_details.goods_pickup": {
            $ifNull: ["$containers.goods_pickup", null],
          },
          "container_details.goods_delivery": {
            $ifNull: ["$containers.goods_delivery", null],
          },
          "container_details.own_hired": {
            $ifNull: ["$containers.own_hired", null],
          },
          "container_details.type_of_vehicle": {
            $ifNull: ["$containers.type_of_vehicle", null],
          },
          "container_details.vehicle_no": {
            $ifNull: ["$containers.vehicle_no", null],
          },
          "container_details.driver_name": {
            $ifNull: ["$containers.driver_name", null],
          },
          "container_details.driver_phone": {
            $ifNull: ["$containers.driver_phone", null],
          },
          "container_details.eWay_bill": {
            $ifNull: ["$containers.eWay_bill", null],
          },
          "container_details.isOccupied": {
            $ifNull: ["$containers.isOccupied", false],
          },
          "container_details.sr_cel_no": {
            $ifNull: ["$containers.sr_cel_no", null],
          },
          "container_details.sr_cel_FGUID": {
            $ifNull: ["$containers.sr_cel_FGUID", null],
          },
          "container_details.sr_cel_id": {
            $ifNull: ["$containers.sr_cel_id", null],
          },
          "container_details.elock": { $ifNull: ["$containers.elock", null] },
          "container_details.status": { $ifNull: ["$containers.status", null] },
          "container_details.lr_completed": {
            $ifNull: ["$containers.lr_completed", false], // Default to false if missing
          },
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const data = await PrData.aggregate(pipeline);
    const total = await PrData.aggregate([
      { $unwind: "$containers" },
      { $match: matchCondition },
      { $count: "total" },
    ]);

    res.json({
      data,
      total: total[0]?.total || 0,
      totalPages: Math.ceil((total[0]?.total || 0) / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

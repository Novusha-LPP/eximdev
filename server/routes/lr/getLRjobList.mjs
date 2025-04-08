import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.get("/api/lr-job-list", async (req, res) => {
  try {
    const { status } = req.query;
    const { page = 1, limit = 100, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const matchCondition =
      status?.toLowerCase() === "pending"
        ? {
            $or: [
              { "containers.lr_completed": { $exists: false } },
              { "containers.lr_completed": false },
            ],
          }
        : { "containers.lr_completed": true };

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
      { $unwind: "$containers" }, // Flatten the containers array
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
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
          "container_details.tr_no": "$containers.tr_no",
          "container_details.container_number": "$containers.container_number",
          "container_details.seal_no": "$containers.seal_no",
          "container_details.gross_weight": "$containers.gross_weight",
          "container_details.tare_weight": "$containers.tare_weight",
          "container_details.net_weight": "$containers.net_weight",
          "container_details.goods_pickup": "$containers.goods_pickup",
          "container_details.goods_delivery": "$containers.goods_delivery",
          "container_details.own_hired": "$containers.own_hired",
          "container_details.type_of_vehicle": "$containers.type_of_vehicle",
          "container_details.vehicle_no": "$containers.vehicle_no",
          "container_details.driver_name": "$containers.driver_name",
          "container_details.driver_phone": "$containers.driver_phone",
          "container_details.eWay_bill": "$containers.eWay_bill",
          "container_details.isOccupied": "$containers.isOccupied",
          "container_details.sr_cel_no": "$containers.sr_cel_no",
          "container_details.sr_cel_FGUID": "$containers.sr_cel_FGUID",
          "container_details.sr_cel_id": "$containers.sr_cel_id",
          "container_details.elock": "$containers.elock",
          "container_details.status": "$containers.status",
          "container_details.lr_completed": "$containers.lr_completed",
        },
      },
    ];

    const data = await PrData.aggregate(pipeline);
    const total = await PrData.aggregate([
      { $match: matchCondition },
      { $unwind: "$containers" },
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

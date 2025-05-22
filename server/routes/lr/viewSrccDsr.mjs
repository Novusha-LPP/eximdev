import express from "express";
import PrData from "../../model/srcc/pr.mjs";

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
            { "containers.lr_completed": { $exists: false } },
          ],
          "containers.tr_no": { $exists: true, $ne: "" },
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
                tracking_status: "$containers.tracking_status",
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
router.get("/api/elock-assign", async (req, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const buildSearchQuery = (search) => {
      if (!search) return {};

      return {
        $or: [
          { "containers.container_number": { $regex: search, $options: "i" } },
          { "containers.tr_no": { $regex: search, $options: "i" } },
          { pr_no: { $regex: search, $options: "i" } },
          { branch: { $regex: search, $options: "i" } },
          { "containers.driver_name": { $regex: search, $options: "i" } },
          { "containers.driver_phone": { $regex: search, $options: "i" } },
          { "containers.vehicle_no": { $regex: search, $options: "i" } },
          { "containers.elock_no": { $regex: search, $options: "i" } },
          {
            "containers.elock_assign_status": { $regex: search, $options: "i" },
          },
        ],
      };
    };

    const searchQuery = buildSearchQuery(search);

    const pipeline = [
      { $unwind: "$containers" },
      {
        $match: {
          "containers.tr_no": { $exists: true, $ne: "" },
          ...searchQuery,
        },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                branch: "$branch",
                container_number: "$containers.container_number",
                tr_no: "$containers.tr_no",
                pr_no: "$pr_no",
                driver_name: "$containers.driver_name",
                driver_phone: "$containers.driver_phone",
                vehicle_no: "$containers.vehicle_no",
                elock_no: "$containers.elock_no",
                elock_assign_status: "$containers.elock_assign_status",
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
    console.error("Error fetching driver basic list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Update E-Lock Assignment Status
router.put("/api/elock-assign/update-status", async (req, res) => {
  try {
    const { pr_no, container_number, elock_assign_status, elock_no } = req.body;

    if (!pr_no || !container_number || !elock_assign_status || !elock_no) {
      return res.status(400).json({
        message:
          "pr_no, container_number, elock_assign_status, and elock_no are required",
      });
    }

    const updated = await PrData.findOneAndUpdate(
      { pr_no, "containers.container_number": container_number },
      {
        $set: {
          "containers.$.elock_assign_status": elock_assign_status,
          "containers.$.elock_no": elock_no,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "PR or container not found" });
    }

    res.status(200).json({
      message: "E-lock assign status and number updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating elock assign status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

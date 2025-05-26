import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import Elock from "../../model/srcc/Directory_Management/Elock.mjs";

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
}); // GET /api/elock-assign endpoint - Fixed to return proper container IDs
router.get("/api/elock-assign", async (req, res) => {
  try {
    const { page = 1, limit = 100, search = "", elock_assign_status, sort } = req.query;
    const skip = (page - 1) * limit;

    // Build match query
    let matchQuery = {};
    let orArray = [];

    // If explicit filter for RETURNED
    if (elock_assign_status === "RETURNED" || sort === "RETURNED") {
      matchQuery["containers.elock_assign_status"] = "RETURNED";
    } else {
      // Default: Exclude RETURNED
      matchQuery["containers.elock_assign_status"] = { $ne: "RETURNED" };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      orArray = [
        { pr_no: searchRegex },
        { branch: searchRegex },
        { "containers.tr_no": searchRegex },
        { "containers.container_number": searchRegex },
        { "containers.driver_name": searchRegex },
        { "containers.driver_phone": searchRegex },
        { "containers.vehicle_no": searchRegex },
        { "containers.elock_no": searchRegex },
      ];
    }

    // Merge $or if present
    let matchStage = {};
    if (orArray.length > 0) {
      matchStage = { $and: [matchQuery, { $or: orArray }] };
    } else {
      matchStage = matchQuery;
    }

    // Aggregation pipeline to flatten containers with proper IDs
    const pipeline = [
      { $unwind: "$containers" },
      { $match: matchStage },
      {
        $project: {
          // PR level fields
          pr_id: "$_id", // Keep the original PR ID
          pr_no: 1,
          branch: 1,
          // Container level fields
          _id: "$containers._id", // Use container's actual _id
          container_id: "$containers._id", // Also provide as container_id for clarity
          tr_no: "$containers.tr_no",
          container_number: "$containers.container_number",
          driver_name: "$containers.driver_name",
          driver_phone: "$containers.driver_phone",
          vehicle_no: "$containers.vehicle_no",
          elock_no: "$containers.elock_no",
          elock_assign_status: "$containers.elock_assign_status",
          // Add other container fields you need
          seal_no: "$containers.seal_no",
          gross_weight: "$containers.gross_weight",
          tare_weight: "$containers.tare_weight",
          net_weight: "$containers.net_weight",
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
    const data = result[0].data || [];
    const totalCount = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      data,
      total: totalCount,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching elock assign data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Assign, change, or return elock for a container
router.post("/api/assign-elock", async (req, res) => {
  try {
    const { prId, containerId, newElockNo, elockAssignStatus } = req.body;

    console.log("Request body:", req.body); // Debug log

    // Find the PR and the container
    const pr = await PrData.findById(prId);
    if (!pr) return res.status(404).json({ error: "PR not found" });

    console.log("PR found:", pr._id);
    console.log("Looking for container with ID:", containerId);
    console.log(
      "Available containers:",
      pr.containers.map((c) => ({ id: c._id.toString(), tr_no: c.tr_no }))
    );

    // Try multiple ways to find the container
    let container = null;

    // Method 1: Direct ID lookup (if containerId is the ObjectId)
    if (containerId) {
      container = pr.containers.id(containerId);
    }

    // Method 2: If not found, try finding by index or other identifier
    if (!container) {
      // If containerId is actually an index
      if (!isNaN(containerId)) {
        container = pr.containers[parseInt(containerId)];
      }
    }

    // Method 3: Find by tr_no if containerId might be tr_no
    if (!container) {
      container = pr.containers.find((c) => c.tr_no === containerId);
    }

    // Method 4: Find by container_number if containerId might be container_number
    if (!container) {
      container = pr.containers.find((c) => c.container_number === containerId);
    }

    if (!container) {
      console.log("Container not found with any method");
      return res.status(404).json({
        error: "Container not found",
        debug: {
          prId,
          containerId,
          availableContainerIds: pr.containers.map((c) => c._id.toString()),
          availableContainerTrNos: pr.containers.map((c) => c.tr_no),
        },
      });
    }

    console.log("Container found:", container._id);

    const oldElockNo = container.elock_no;
    const oldAssignStatus = container.elock_assign_status;

    // If elock is changed, set old elock status to AVAILABLE
    if (oldElockNo && oldElockNo !== newElockNo) {
      await Elock.findOneAndUpdate(
        { FAssetID: oldElockNo },
        { status: "AVAILABLE" }
      );
    }

    // If elock is returned, set elock status to AVAILABLE
    if (elockAssignStatus === "RETURNED" && oldElockNo) {
      await Elock.findOneAndUpdate(
        { FAssetID: oldElockNo },
        { status: "AVAILABLE" }
      );
    }

    // If assigning a new elock, set its status to ASSIGNED
    if (newElockNo && elockAssignStatus === "ASSIGNED") {
      await Elock.findOneAndUpdate(
        { FAssetID: newElockNo },
        { status: "ASSIGNED" }
      );
    }

    // Update container fields
    container.elock_no = newElockNo;
    container.elock_assign_status = elockAssignStatus;
    await pr.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in assign-elock:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Get available elocks for dropdown
router.get("/api/available-elocks", async (req, res) => {
  try {
    const elocks = await Elock.find({ status: "AVAILABLE" });
    res.status(200).json(elocks);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

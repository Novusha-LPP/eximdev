import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import ElockAssginOthersModel from "../../model/srcc/ElockAssginOthersModel.mjs";
import Elock from "../../model/srcc/Directory_Management/Elock.mjs";
import LrTrackingStages from "../../model/srcc/Directory_Management/LrTrackingStages.mjs";

const router = express.Router();

router.get("/api/view-srcc-dsr", async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum; // Build query with populated fields (same as getLRjobList.mjs)
    let baseQuery = PrData.find({})
      .populate("consignor", "name")
      .populate("consignee", "name")
      .populate("container_type", "container_type")
      .populate("shipping_line", "name")
      .populate("goods_pickup", "name")
      .populate("goods_delivery", "name")
      .populate("type_of_vehicle", "vehicleType")
      .populate("container_loading", "name")
      .populate("container_offloading", "name")
      .populate("containers.goods_pickup", "name")
      .populate("containers.goods_delivery", "name")
      .populate("containers.type_of_vehicle", "vehicleType")
      .populate("containers.tracking_status", "name description")
      .populate("containers.elock_no", "_id FAssetID status");

    // Get all data first
    let allData = await baseQuery.exec();

    // Filter and flatten containers based on DSR criteria
    let flattenedData = [];

    allData.forEach((prItem) => {
      prItem.containers.forEach((container) => {
        // Check DSR conditions: tr_no exists and not empty, lr_completed is false or doesn't exist
        if (!container.tr_no || container.tr_no === "") return;
        if (container.lr_completed === true) return;

        flattenedData.push({
          tr_no: container.tr_no,
          container_number: container.container_number,
          consignor: prItem.consignor,
          consignee: prItem.consignee,
          container_type: prItem.container_type,
          shipping_line: prItem.shipping_line,
          goods_pickup: prItem.goods_pickup,
          goods_delivery: prItem.goods_delivery,
          type_of_vehicle: prItem.type_of_vehicle,
          container_loading: prItem.container_loading,
          container_offloading: prItem.container_offloading,
          container_details: {
            goods_pickup: container.goods_pickup,
            goods_delivery: container.goods_delivery,
            type_of_vehicle: container.type_of_vehicle,
          },
          branch: prItem.branch,
          vehicle_no: container.vehicle_no,
          driver_name: container.driver_name,
          driver_phone: container.driver_phone,
          sr_cel_no: container.sr_cel_no,
          sr_cel_FGUID: container.sr_cel_FGUID,
          sr_cel_id: container.sr_cel_id,
          tracking_status: container.tracking_status,
          do_validity: prItem.do_validity,
          status: container.status,
          lr_completed: container.lr_completed || false,
        });
      });
    });

    // Sort by tr_no (descending) - extract numeric part for proper sorting
    flattenedData.sort((a, b) => {
      const getNumericPart = (trNo) => {
        if (!trNo) return 0;
        const parts = trNo.split("/");
        return parseInt(parts[2]) || 0;
      };
      return getNumericPart(b.tr_no) - getNumericPart(a.tr_no);
    });

    // Calculate total after all filters
    const total = flattenedData.length;

    // Apply pagination
    const data = flattenedData.slice(skip, skip + limitNum);

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
    const {
      page = 1,
      limit = 100,
      search = "",
      elock_assign_status,
      sort,
    } = req.query;
    const skip = (page - 1) * limit;

    // Build match query
    let matchQuery = {
      "containers.tr_no": { $exists: true, $ne: "" }, // Only containers with non-empty tr_no
    };
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
        // Remove direct elock_no search since it's now an ObjectId
        // We'll handle elock search through the lookup stage
      ];
    }

    // Merge $or if present
    let matchStage = {};
    if (orArray.length > 0) {
      matchStage = { $and: [matchQuery, { $or: orArray }] };
    } else {
      matchStage = matchQuery;
    } // Aggregation pipeline to flatten containers with proper IDs
    const pipeline = [
      { $unwind: "$containers" },
      {
        $lookup: {
          from: "elocks",
          localField: "containers.elock_no",
          foreignField: "_id",
          as: "containers.elock_no_details",
        },
      },
      { $match: matchStage },
      // Add additional search match after lookup for elock FAssetID
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { pr_no: new RegExp(search, "i") },
                  { branch: new RegExp(search, "i") },
                  { "containers.tr_no": new RegExp(search, "i") },
                  { "containers.container_number": new RegExp(search, "i") },
                  { "containers.driver_name": new RegExp(search, "i") },
                  { "containers.driver_phone": new RegExp(search, "i") },
                  { "containers.vehicle_no": new RegExp(search, "i") },
                  {
                    "containers.elock_no_details.FAssetID": new RegExp(
                      search,
                      "i"
                    ),
                  },
                ],
              },
            },
          ]
        : []),
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
          elock_no: {
            $cond: {
              if: { $gt: [{ $size: "$containers.elock_no_details" }, 0] },
              then: {
                $arrayElemAt: ["$containers.elock_no_details.FAssetID", 0],
              },
              else: null,
            },
          },
          elock_no_id: "$containers.elock_no",
          elock_no_details: {
            $arrayElemAt: ["$containers.elock_no_details", 0],
          },
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
    if (oldElockNo && oldElockNo.toString() !== newElockNo) {
      await Elock.findByIdAndUpdate(oldElockNo, { status: "AVAILABLE" });
    }

    // If elock is returned, set elock status to AVAILABLE
    if (elockAssignStatus === "RETURNED" && oldElockNo) {
      await Elock.findByIdAndUpdate(oldElockNo, { status: "AVAILABLE" });
    }

    // If assigning a new elock, set its status to ASSIGNED
    if (newElockNo && elockAssignStatus === "ASSIGNED") {
      await Elock.findByIdAndUpdate(newElockNo, { status: "ASSIGNED" });
    }

    // Update container fields
    container.elock_no = newElockNo || null;
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

// Get tracking status options for dropdown
router.get("/api/lr-tracking-status", async (req, res) => {
  try {
    const trackingStages = await LrTrackingStages.find().select(
      "_id name description"
    );
    res.status(200).json(trackingStages);
  } catch (error) {
    console.error("Error fetching tracking status options:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

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
});

// GET /api/elock-assign endpoint - Fixed to return proper container IDs and include ElockAssignOthers data
router.get("/api/elock-assign&other-history", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = "",
      elock_assign_status,
      sort,
    } = req.query;
    const skip = (page - 1) * limit;

    // Build match query for containers
    let containerMatchQuery = {
      "containers.tr_no": { $exists: true, $ne: "" }, // Only containers with non-empty tr_no
    };
    let containerOrArray = [];

    // Build match query for ElockAssignOthers
    let othersMatchQuery = {};

    // If explicit filter for RETURNED
    if (elock_assign_status === "RETURNED" || sort === "RETURNED") {
      containerMatchQuery["containers.elock_assign_status"] = "RETURNED";
      othersMatchQuery["elock_assign_status"] = "RETURNED";
    } else {
      // Default: Exclude RETURNED
      containerMatchQuery["containers.elock_assign_status"] = {
        $ne: "RETURNED",
      };
      othersMatchQuery["elock_assign_status"] = { $ne: "RETURNED" };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      containerOrArray = [
        { pr_no: searchRegex },
        { branch: searchRegex },
        { "containers.tr_no": searchRegex },
        { "containers.container_number": searchRegex },
        { "containers.driver_name": searchRegex },
        { "containers.driver_phone": searchRegex },
        { "containers.vehicle_no": searchRegex },
      ];
    }

    // Merge $or if present for containers
    let containerMatchStage = {};
    if (containerOrArray.length > 0) {
      containerMatchStage = {
        $and: [containerMatchQuery, { $or: containerOrArray }],
      };
    } else {
      containerMatchStage = containerMatchQuery;
    }

    // Aggregation pipeline for containers
    const containersPipeline = [
      { $unwind: "$containers" },
      {
        $lookup: {
          from: "elocks",
          localField: "containers.elock_no",
          foreignField: "_id",
          as: "containers.elock_no_details",
        },
      },
      { $match: containerMatchStage },
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
          // Add source identifier
          source: { $literal: "containers" },
          transporter: null,
          client: null,
         
        },
      },
    ];

    // Aggregation pipeline for ElockAssignOthers
    const escapeRegex = (string) => {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    };

    const othersPipeline = [
      // Lookup for transporter
      {
        $lookup: {
          from: "organisations",
          localField: "transporter",
          foreignField: "_id",
          as: "transporter_details",
        },
      },
      // Lookup for client
      {
        $lookup: {
          from: "organisations",
          localField: "client",
          foreignField: "_id",
          as: "client_details",
        },
      },
      // Lookup for elock
      {
        $lookup: {
          from: "elocks",
          localField: "elock_no",
          foreignField: "_id",
          as: "elock_details",
        },
      },
      // Lookup for goods_pickup location
      {
        $lookup: {
          from: "locations",
          localField: "goods_pickup",
          foreignField: "_id",
          as: "goods_pickup_details",
        },
      },
      // Lookup for goods_delivery location
      {
        $lookup: {
          from: "locations",
          localField: "goods_delivery",
          foreignField: "_id",
          as: "goods_delivery_details",
        },
      },
      // Match stage for status filtering
      {
        $match: othersMatchQuery,
      },
      // Additional search match after lookups
      ...(search
        ? [
            {
              $match: {
                $or: [
                 
                  { tr_no: new RegExp(escapeRegex(search), "i") },
                  { container_number: new RegExp(escapeRegex(search), "i") },
                  { driver_name: new RegExp(escapeRegex(search), "i") },
                  { driver_phone: new RegExp(escapeRegex(search), "i") },
                  { vehicle_no: new RegExp(escapeRegex(search), "i") },
                  {
                    "transporter_details.name": new RegExp(
                      escapeRegex(search),
                      "i"
                    ),
                  },
                  {
                    "client_details.name": new RegExp(escapeRegex(search), "i"),
                  },
                  {
                    "elock_details.FAssetID": new RegExp(
                      escapeRegex(search),
                      "i"
                    ),
                  },
                  {
                    "goods_pickup_details.name": new RegExp(
                      escapeRegex(search),
                      "i"
                    ),
                  },
                  {
                    "goods_delivery_details.name": new RegExp(
                      escapeRegex(search),
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
          _id: 1,
          container_id: "$_id", // Use same field name for consistency
          pr_id: null,
          pr_no: null,
          branch: null,
      
          tr_no: 1,
          container_number: 1,
          driver_name: 1,
          driver_phone: 1,
          vehicle_no: 1,
          elock_assign_status: 1,
          elock_no: {
            $cond: {
              if: { $gt: [{ $size: "$elock_details" }, 0] },
              then: { $arrayElemAt: ["$elock_details.FAssetID", 0] },
              else: null,
            },
          },
          elock_no_id: "$elock_no",
          elock_no_details: {
            $arrayElemAt: ["$elock_details", 0],
          },
          seal_no: null,
          gross_weight: null,
          tare_weight: null,
          net_weight: null,
          tr_no: 1,
          // Add source identifier
          source: { $literal: "others" },
          transporter: {
            $cond: {
              if: { $gt: [{ $size: "$transporter_details" }, 0] },
              then: { $arrayElemAt: ["$transporter_details", 0] },
              else: null,
            },
          },
          client: {
            $cond: {
              if: { $gt: [{ $size: "$client_details" }, 0] },
              then: { $arrayElemAt: ["$client_details", 0] },
              else: null,
            },
          },
        },
      },
    ];

    // Execute both pipelines
    const [containersResult, othersResult] = await Promise.all([
      PrData.aggregate(containersPipeline),
      ElockAssginOthersModel.aggregate(othersPipeline),
    ]);

    // Combine results
    const combinedData = [...containersResult, ...othersResult];

    // Sort combined data by creation date (newest first) or by elock_assign_status
    combinedData.sort((a, b) => {
      // First sort by status priority (ASSIGNED > UNASSIGNED > RETURNED)
      const statusPriority = {
        ASSIGNED: 3,
        UNASSIGNED: 2,
        RETURNED: 1,
        "NOT RETURNED": 1,
      };
      const aPriority = statusPriority[a.elock_assign_status] || 0;
      const bPriority = statusPriority[b.elock_assign_status] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Then sort by tr_no or lr_no
      const aRef = a.tr_no ||  "";
      const bRef = b.tr_no ||  "";
      return bRef.localeCompare(aRef);
    });

    // Calculate total and apply pagination
    const total = combinedData.length;
    const paginatedData = combinedData.slice(skip, skip + parseInt(limit));
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: paginatedData,
      total,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching elock assign data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// GET /api/elock-assign endpoint - Container data only
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

    // Build match query for containers
    let containerMatchQuery = {
      "containers.tr_no": { $exists: true, $ne: "" }, // Only containers with non-empty tr_no
    };
    let containerOrArray = [];

    // If explicit filter for RETURNED
    if (elock_assign_status === "RETURNED" || sort === "RETURNED") {
      containerMatchQuery["containers.elock_assign_status"] = "RETURNED";
    } else {
      // Default: Exclude RETURNED
      containerMatchQuery["containers.elock_assign_status"] = {
        $ne: "RETURNED",
      };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      containerOrArray = [
        { pr_no: searchRegex },
        { branch: searchRegex },
        { "containers.tr_no": searchRegex },
        { "containers.container_number": searchRegex },
        { "containers.driver_name": searchRegex },
        { "containers.driver_phone": searchRegex },
        { "containers.vehicle_no": searchRegex },
      ];
    }

    // Merge $or if present for containers
    let containerMatchStage = {};
    if (containerOrArray.length > 0) {
      containerMatchStage = {
        $and: [containerMatchQuery, { $or: containerOrArray }],
      };
    } else {
      containerMatchStage = containerMatchQuery;
    }

    // Aggregation pipeline for containers only
    const containersPipeline = [
      { $unwind: "$containers" },
      {
        $lookup: {
          from: "elocks",
          localField: "containers.elock_no",
          foreignField: "_id",
          as: "containers.elock_no_details",
        },
      },
      { $match: containerMatchStage },
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
    ];

    // Execute containers pipeline only
    const containersResult = await PrData.aggregate(containersPipeline);

    // Sort data by creation date (newest first) or by elock_assign_status
    containersResult.sort((a, b) => {
      // First sort by status priority (ASSIGNED > UNASSIGNED > RETURNED)
      const statusPriority = {
        ASSIGNED: 3,
        UNASSIGNED: 2,
        RETURNED: 1,
        "NOT RETURNED": 1,
      };
      const aPriority = statusPriority[a.elock_assign_status] || 0;
      const bPriority = statusPriority[b.elock_assign_status] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Then sort by tr_no
      const aRef = a.tr_no || "";
      const bRef = b.tr_no || "";
      return bRef.localeCompare(aRef);
    });

    // Calculate total and apply pagination
    const total = containersResult.length;
    const paginatedData = containersResult.slice(skip, skip + parseInt(limit));
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: paginatedData,
      total,
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

    // Find the PR and the container
    const pr = await PrData.findById(prId);
    if (!pr) return res.status(404).json({ error: "PR not found" });

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

import express from "express";
import ElockAssginOthersModel from "../../model/srcc/ElockAssginOthersModel.mjs";
import Elock from "../../model/srcc/Directory_Management/Elock.mjs";

const router = express.Router();

// GET /api/elock/assign-others - Get all elock assign others records with pagination and search
router.get("/api/elock/assign-others", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = "",
      elock_assign_status,
      sort,
    } = req.query;
    const skip = (page - 1) * limit;

    // Generate search query
    const escapeRegex = (string) => {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escaping special regex characters
    };

    // Build match query - exclude RETURNED records by default
    let matchQuery = {
      elock_assign_status: { $ne: "RETURNED" },
    };

    // If explicitly requesting RETURNED records
    if (elock_assign_status === "RETURNED" || sort === "RETURNED") {
      matchQuery.elock_assign_status = "RETURNED";
    }

    // Build search conditions
    let searchConditions = [];
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      searchConditions = [
        // We'll add populated field searches in the aggregation pipeline
      ];
    }

    // Aggregation pipeline
    const pipeline = [
      // Lookup for consignor
      {
        $lookup: {
          from: "organisations",
          localField: "consignor",
          foreignField: "_id",
          as: "consignor_details",
        },
      },
      // Lookup for consignee
      {
        $lookup: {
          from: "organisations",
          localField: "consignee",
          foreignField: "_id",
          as: "consignee_details",
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
        $match: matchQuery,
      },
      // Additional search match after lookups
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { tr_no: new RegExp(escapeRegex(search), "i") },
                  { container_number: new RegExp(escapeRegex(search), "i") },
                  { vehicle_no: new RegExp(escapeRegex(search), "i") },
                  { driver_name: new RegExp(escapeRegex(search), "i") },
                  { driver_phone: new RegExp(escapeRegex(search), "i") },
                  {
                    "consignor_details.name": new RegExp(
                      escapeRegex(search),
                      "i"
                    ),
                  },
                  {
                    "consignee_details.name": new RegExp(
                      escapeRegex(search),
                      "i"
                    ),
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
      // Project stage to format the output
      {
        $project: {
          _id: 1,

          tr_no: 1,
          container_number: 1,
          vehicle_no: 1,
          driver_name: 1,
          driver_phone: 1,
          elock_assign_status: 1,
          createdAt: 1,
          updatedAt: 1,
          consignor: {
            $cond: {
              if: { $gt: [{ $size: "$consignor_details" }, 0] },
              then: { $arrayElemAt: ["$consignor_details", 0] },
              else: null,
            },
          },
          consignee: {
            $cond: {
              if: { $gt: [{ $size: "$consignee_details" }, 0] },
              then: { $arrayElemAt: ["$consignee_details", 0] },
              else: null,
            },
          },
          elock_no: {
            $cond: {
              if: { $gt: [{ $size: "$elock_details" }, 0] },
              then: { $arrayElemAt: ["$elock_details", 0] },
              else: null,
            },
          },
          goods_pickup: {
            $cond: {
              if: { $gt: [{ $size: "$goods_pickup_details" }, 0] },
              then: { $arrayElemAt: ["$goods_pickup_details", 0] },
              else: null,
            },
          },
          goods_delivery: {
            $cond: {
              if: { $gt: [{ $size: "$goods_delivery_details" }, 0] },
              then: { $arrayElemAt: ["$goods_delivery_details", 0] },
              else: null,
            },
          },
        },
      },
      // Sort by creation date (newest first)
      {
        $sort: { createdAt: -1 },
      },
      // Facet for pagination
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: parseInt(limit) }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await ElockAssginOthersModel.aggregate(pipeline);
    const data = result[0].data || [];
    const totalCount = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      jobs: data,
      totalJobs: totalCount,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching elock assign others data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/elock/assign-others - Create new elock assign others record
router.post("/api/elock/assign-others", async (req, res) => {
  try {
    const {
      consignor,
      consignee,
      tr_no,
      container_number,
      vehicle_no,
      driver_name,
      driver_phone,
      elock_no,
      elock_assign_status,
      goods_pickup,
      goods_delivery,
    } = req.body;

    // Validate required fields
    if (!consignor || !consignee) {
      return res
        .status(400)
        .json({ error: "Consignor and Consignee are required" });
    }

    // If assigning an elock, update its status
    if (elock_no && elock_assign_status === "ASSIGNED") {
      await Elock.findByIdAndUpdate(elock_no, { status: "ASSIGNED" });
    }
    const newRecord = await ElockAssginOthersModel.create({
      consignor,
      consignee,

      tr_no,
      container_number,
      vehicle_no,
      driver_name,
      driver_phone,
      elock_no: elock_no || null,
      elock_assign_status: elock_assign_status || "UNASSIGNED",
      goods_pickup,
      goods_delivery,
    });

    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    console.error("Error creating elock assign others record:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// PUT /api/elock/assign-others/:id - Update elock assign others record
router.put("/api/elock/assign-others/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      consignor,
      consignee,

      tr_no,
      container_number,
      vehicle_no,
      driver_name,
      driver_phone,
      elock_no,
      elock_assign_status,
      goods_pickup,
      goods_delivery,
    } = req.body;

    // Find the existing record
    const existingRecord = await ElockAssginOthersModel.findById(id);
    if (!existingRecord) {
      return res.status(404).json({ error: "Record not found" });
    }

    const oldElockNo = existingRecord.elock_no;

    // Handle elock status changes
    // If elock is changed, set old elock status to AVAILABLE
    if (oldElockNo && oldElockNo.toString() !== elock_no) {
      await Elock.findByIdAndUpdate(oldElockNo, { status: "AVAILABLE" });
    }

    // If elock is returned, set elock status to AVAILABLE
    if (elock_assign_status === "RETURNED" && oldElockNo) {
      await Elock.findByIdAndUpdate(oldElockNo, { status: "AVAILABLE" });
    }

    // If assigning a new elock, set its status to ASSIGNED
    if (elock_no && elock_assign_status === "ASSIGNED") {
      await Elock.findByIdAndUpdate(elock_no, { status: "ASSIGNED" });
    } // Update the record
    const updatedRecord = await ElockAssginOthersModel.findByIdAndUpdate(
      id,
      {
        consignor,
        consignee,

        tr_no,
        container_number,
        vehicle_no,
        driver_name,
        driver_phone,
        elock_no: elock_no || null,
        elock_assign_status,
        goods_pickup,
        goods_delivery,
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error("Error updating elock assign others record:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// DELETE /api/elock/assign-others/:id - Delete elock assign others record
router.delete("/api/elock/assign-others/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the record to get elock info
    const record = await ElockAssginOthersModel.findById(id);
    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    // If there's an assigned elock, set its status back to AVAILABLE
    if (record.elock_no && record.elock_assign_status === "ASSIGNED") {
      await Elock.findByIdAndUpdate(record.elock_no, { status: "AVAILABLE" });
    }

    // Delete the record
    await ElockAssginOthersModel.findByIdAndDelete(id);

    res
      .status(200)
      .json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting elock assign others record:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// POST /api/assign-elock-others - Legacy endpoint for assign/change/return elock
router.post("/api/assign-elock-others", async (req, res) => {
  try {
    const { elockAssignOthersId, newElockNo, elockAssignStatus } = req.body;
    // Find the ElockAssignOthers record
    const elockAssignRecord = await ElockAssginOthersModel.findById(
      elockAssignOthersId
    );
    if (!elockAssignRecord) {
      return res.status(404).json({ error: "Elock assign record not found" });
    }


    const oldElockNo = elockAssignRecord.elock_no;

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

    // Update ElockAssignOthers fields
    elockAssignRecord.elock_no = newElockNo || null;
    elockAssignRecord.elock_assign_status = elockAssignStatus;
    await elockAssignRecord.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in assign-elock-others:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

export default router;

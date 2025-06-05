import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.get("/api/lr-job-list", async (req, res) => {
  try {
    const { status } = req.query;
    const { page = 1, limit = 100, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Generate search query with escaped regex
    const escapeRegex = (string) => {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    };

    // Build initial query with populated fields
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
      .populate("containers.type_of_vehicle", "vehicleType");

    // Get all data first
    let allData = await baseQuery.exec();

    // Filter and flatten containers based on status and tr_no conditions
    let flattenedData = [];

    allData.forEach((prItem) => {
      prItem.containers.forEach((container) => {
        // Check tr_no condition - must exist and not be empty
        if (!container.tr_no || container.tr_no === "") return;

        // Check status condition
        let includeContainer = false;
        if (status?.toLowerCase() === "pending") {
          includeContainer = !container.lr_completed;
        } else if (status?.toLowerCase() === "completed") {
          includeContainer = container.lr_completed === true;
        } else if (status?.toLowerCase() === "all" || !status) {
          includeContainer = true;
        }

        if (includeContainer) {
          flattenedData.push({
            _id: prItem._id,
            pr_no: prItem.pr_no,
            pr_date: prItem.pr_date,
            branch: prItem.branch,
            consignor: prItem.consignor,
            consignee: prItem.consignee,
            container_type: prItem.container_type,
            shipping_line: prItem.shipping_line,
            goods_pickup: prItem.goods_pickup,
            goods_delivery: prItem.goods_delivery,
            container_count: prItem.container_count,
            no_of_vehicle: prItem.no_of_vehicle,
            container_details: {
              tr_no: container.tr_no,
              container_number: container.container_number || null,
              seal_no: container.seal_no || null,
              gross_weight: container.gross_weight || null,
              tare_weight: container.tare_weight || null,
              net_weight: container.net_weight || null,
              goods_pickup: container.goods_pickup || null,
              goods_delivery: container.goods_delivery || null,
              own_hired: container.own_hired || null,
              type_of_vehicle: container.type_of_vehicle || null,
              vehicle_no: container.vehicle_no || null,
              driver_name: container.driver_name || null,
              driver_phone: container.driver_phone || null,
              eWay_bill: container.eWay_bill || null,
              isOccupied: container.isOccupied || false,
              sr_cel_no: container.sr_cel_no || null,
              sr_cel_FGUID: container.sr_cel_FGUID || null,
              sr_cel_id: container.sr_cel_id || null,
              elock: container.elock_no || null,
              status: container.status || null,
              lr_completed: container.lr_completed || false,
            },
          });
        }
      });
    });

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      flattenedData = flattenedData.filter((item) => {
        return (
          searchRegex.test(item.pr_no || "") ||
          searchRegex.test(item.branch || "") ||
          searchRegex.test(item.consignor?.name || "") ||
          searchRegex.test(item.consignee?.name || "") ||
          searchRegex.test(item.container_type?.container_type || "") ||
          searchRegex.test(item.shipping_line?.name || "") ||
          searchRegex.test(item.goods_pickup?.name || "") ||
          searchRegex.test(item.goods_delivery?.name || "") ||
          searchRegex.test(item.container_details.tr_no || "") ||
          searchRegex.test(item.container_details.container_number || "") ||
          searchRegex.test(item.container_details.seal_no || "") ||
          searchRegex.test(item.container_details.own_hired || "") ||
          searchRegex.test(item.container_details.vehicle_no || "") ||
          searchRegex.test(item.container_details.driver_name || "") ||
          searchRegex.test(item.container_details.driver_phone || "") ||
          searchRegex.test(item.container_details.eWay_bill || "") ||
          searchRegex.test(item.container_details.sr_cel_no || "") ||
          searchRegex.test(item.container_details.elock || "") ||
          searchRegex.test(item.container_details.status || "") ||
          searchRegex.test(item.container_details.goods_pickup?.name || "") ||
          searchRegex.test(item.container_details.goods_delivery?.name || "") ||
          searchRegex.test(
            item.container_details.type_of_vehicle?.vehicleType || ""
          )
        );
      });
    }

    // Calculate total after all filters
    const total = flattenedData.length;

    // Apply pagination
    const data = flattenedData.slice(skip, skip + parseInt(limit));

    res.json({
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error in LR job list API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

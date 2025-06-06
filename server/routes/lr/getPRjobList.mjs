import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.get("/api/pr-job-list", async (req, res) => {
  try {
    const { status } = req.query; // Only status is received
    const { page = 1, limit = 100, search = "" } = req.query;
    const skip = (page - 1) * limit;

    let matchCondition = {};

    if (status?.toLowerCase() === "pending") {
      matchCondition = {
        $or: [
          { status: { $exists: false } },
          { status: "" },
          { status: "pending" },
        ],
      };
    } else if (status?.toLowerCase() === "completed") {
      matchCondition = {
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
      };
    } else if (status?.toLowerCase() === "all") {
      matchCondition = {}; // No filtering, include all jobs
    } // Generate search query with escaped regex
    const escapeRegex = (string) => {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escaping special regex characters
    };
    const buildSearchQuery = (search) => ({
      $or: [
        { pr_no: { $regex: escapeRegex(search), $options: "i" } },
        { branch: { $regex: escapeRegex(search), $options: "i" } },
        { import_export: { $regex: escapeRegex(search), $options: "i" } },
        { type_of_vehicle: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { container_loading: { $regex: escapeRegex(search), $options: "i" } },
        {
          container_offloading: { $regex: escapeRegex(search), $options: "i" },
        },
        { instructions: { $regex: escapeRegex(search), $options: "i" } },
        { document_no: { $regex: escapeRegex(search), $options: "i" } },
        { status: { $regex: escapeRegex(search), $options: "i" } },
      ],
    });

    // Build initial query with status condition
    let query = PrData.find(matchCondition);

    // Populate referenced fields first
    query = query
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

    // Get all data first if search is provided (for filtering populated fields)
    let allData = await query.exec();

    // Apply search filter on populated data if search is provided
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      allData = allData.filter((item) => {
        return (
          searchRegex.test(item.pr_no || "") ||
          searchRegex.test(item.branch || "") ||
          searchRegex.test(item.import_export || "") ||
          searchRegex.test(item.description || "") ||
          searchRegex.test(item.instructions || "") ||
          searchRegex.test(item.document_no || "") ||
          searchRegex.test(item.status || "") ||
          searchRegex.test(item.consignor?.name || "") ||
          searchRegex.test(item.consignee?.name || "") ||
          searchRegex.test(item.container_type?.container_type || "") ||
          searchRegex.test(item.shipping_line?.name || "") ||
          searchRegex.test(item.goods_pickup?.name || "") ||
          searchRegex.test(item.goods_delivery?.name || "") ||
          searchRegex.test(item.type_of_vehicle?.vehicleType || "") ||
          searchRegex.test(item.container_loading?.name || "") ||
          searchRegex.test(item.container_offloading?.name || "")
        );
      });
    }

    // Calculate total after search filter
    const total = allData.length;

    // Apply pagination to filtered results
    const data = allData.slice(skip, skip + parseInt(limit));

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

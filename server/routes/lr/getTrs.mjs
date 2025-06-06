import express from "express";
import PrData from "../../model/srcc/pr.mjs";
const router = express.Router();

router.post("/api/get-trs", async (req, res) => {
  const { pr_no } = req.body;
  const data = await PrData.findOne({ pr_no })
    .populate({
      path: "containers.goods_pickup",
      model: "Location",
      select: "name",
    })
    .populate({
      path: "containers.goods_delivery",
      model: "Location",
      select: "name",
    })
    .populate({
      path: "containers.type_of_vehicle",
      model: "VehicleType",
      select: "vehicleType",
    });

  if (!data) {
    return res.status(404).json({ message: "Not found" });
  }
  const trs = data.containers;

  res.status(200).json(trs);
});

export default router;

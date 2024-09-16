import express from "express";
import LocationMaster from "../../model/srcc/locationMaster.mjs";
const router = express.Router();

router.get("/api/get-locations", async (req, res) => {
  const data = await LocationMaster.find({});
  const locations = data.map((item) => item.location);
  res.status(200).json(locations);
});

export default router;

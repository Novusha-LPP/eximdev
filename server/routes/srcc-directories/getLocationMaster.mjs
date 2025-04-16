import express from "express";
import LocationMaster from "../../model/srcc/locationMaster.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";
const router = express.Router();

router.get("/api/get-location-master",authenticateJWT, async (req, res) => {
  const data = await LocationMaster.find({});
  res.status(200).json(data);
});

export default router;

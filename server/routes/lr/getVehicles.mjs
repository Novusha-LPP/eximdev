import express from "express";
import VehicleModel from "../../model/srcc/vehicleModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-vehicles",authenticateJWT, async (req, res) => {
  try {
    const vehicles = await VehicleModel.find();
    if (!vehicles) {
      res.status(200).json({ message: "No vehicles found" });
      return;
    }
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

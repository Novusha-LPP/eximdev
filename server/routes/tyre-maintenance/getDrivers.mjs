import express from "express";
import DriverModel from "../../model/srcc/driverDetails.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-drivers",authenticateJWT, async (req, res) => {
  const drivers = await DriverModel.find({});

  if (drivers) {
    res.status(200).json(drivers);
  } else {
    res.status(200).json({ message: "No driver found" });
  }
});

export default router;

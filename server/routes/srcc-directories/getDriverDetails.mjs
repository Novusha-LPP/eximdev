import express from "express";
import DriverDetails from "../../model/srcc/driverDetails.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-driver-details",authenticateJWT, async (req, res) => {
  try {
    const driverDetails = await DriverDetails.find({});
    if (driverDetails.length === 0) {
      res.status(200).json({ message: "No driver details found" });
    }
    res.status(200).json(driverDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

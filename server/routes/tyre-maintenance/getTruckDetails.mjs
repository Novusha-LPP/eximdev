import express from "express";
import Truck from "../../model/srcc/vehicleModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get(
  "/api/get-truck-details/:truck_no",
  authenticateJWT,
  async (req, res) => {
    const { truck_no } = req.params;

    try {
      const existingTruckDetails = await Truck.findOne({
        truck_no,
      });

      if (existingTruckDetails) {
        res.status(200).json(existingTruckDetails);
      } else {
        res.status(404).json({ message: "Truck details not found" });
      }
    } catch (error) {
      console.error("Error retrieving truck details:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

export default router;

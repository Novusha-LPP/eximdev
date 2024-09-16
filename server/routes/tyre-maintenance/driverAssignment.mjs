import express from "express";
import Vehicles from "../../model/srcc/vehicleModel.mjs";
const router = express.Router();

router.post("/api/driver-assignment", async (req, res) => {
  const {
    truck_no,
    driver_name,
    assign_date,
    assign_odometer,
    driver_license,
  } = req.body;

  try {
    let existingTruck = await Vehicles.findOne({ truck_no });

    if (existingTruck) {
      // If the truck is found, update the existing drivers array
      existingTruck.drivers.push({
        driver_name,
        assign_date,
        assign_odometer,
        driver_license,
      });

      existingTruck = await existingTruck.save();
      res.status(200).json({ message: "Driver assigned successfully" });
    } else {
      // If the truck is not found, create a new truck with the driver details
      const newTruck = new Vehicles({
        truck_no,
        drivers: [
          {
            driver_name,
            assign_date,
            assign_odometer,
            driver_license,
          },
        ],
      });

      await newTruck.save();
      res.status(200).json({ message: "Driver assigned successfully" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;

import express from "express";
import TypeOfVehicle from "../../model/srcc/typeOfVehicle.mjs";

const router = express.Router();

router.get("/api/get-type-of-vehicles", async (req, res) => {
  try {
    const existingTypeOfVehicle = await TypeOfVehicle.find({});
    const typeOfVehiclesArray = existingTypeOfVehicle.map(
      (vehicle) => vehicle.type_of_vehicle
    );
    res.status(200).json(typeOfVehiclesArray);
  } catch (error) {
    console.error("Error retrieving type of vehicles:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;

import express from "express";
import VehicleType from "../../../model/srcc/Directory_Management/VehicleType.mjs";

const router = express.Router();

router.post("/api/add-vehicle-type", async (req, res) => {
  const {
    vehicleType,
    shortName,
    loadCapacity,
    engineCapacity,
    cargoTypeAllowed,
    CommodityCarry,
  } = req.body;

  try {
    // Check if the vehicle type already exists
    const existingVehicle = await VehicleType.findOne({ vehicleType });
    if (existingVehicle) {
      return res.status(400).json({ error: "Vehicle type already exists" });
    }

    // Create a new VehicleType entry
    const newVehicle = await VehicleType.create({
      vehicleType,
      shortName,
      loadCapacity,
      engineCapacity,
      cargoTypeAllowed,
      CommodityCarry,
    });
    res.status(201).json({
      message: "Vehicle Type added successfully",
      data: newVehicle,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/get-vehicle-type", async (req, res) => {
  try {
    const vehicles = await VehicleType.find();
    res.status(200).json({ data: vehicles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/get-vehicle-type/:vehicleType", async (req, res) => {
  const { vehicleType } = req.params;
  try {
    const vehicle = await VehicleType.findOne({ vehicleType });
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle type not found" });
    }
    res.status(200).json({ data: vehicle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/update-vehicle-type/:vehicleType", async (req, res) => {
  const { vehicleType } = req.params;
  const {
    shortName,
    loadCapacity,
    engineCapacity,
    cargoTypeAllowed,
    CommodityCarry,
  } = req.body;

  try {
    const existingVehicle = await VehicleType.findOne({ vehicleType });

    if (!existingVehicle) {
      return res.status(404).json({ error: "Vehicle type not found" });
    }

    // Update the vehicle details
    existingVehicle.shortName = shortName;
    existingVehicle.loadCapacity = loadCapacity;
    existingVehicle.engineCapacity = engineCapacity;
    existingVehicle.cargoTypeAllowed = cargoTypeAllowed;
    existingVehicle.CommodityCarry = CommodityCarry;

    const updatedVehicle = await existingVehicle.save();

    res.status(200).json({
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/delete-vehicle-type/:vehicleType", async (req, res) => {
  const { vehicleType } = req.params;
  try {
    const deletedVehicle = await VehicleType.findOneAndDelete({ vehicleType });
    if (!deletedVehicle) {
      return res.status(404).json({ error: "Vehicle type not found" });
    }
    res.status(200).json({
      message: "Vehicle type deleted successfully",
      data: deletedVehicle,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
